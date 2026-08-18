import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../services/api.ts';
import type { MalpracticeEventType, ProctorStatus, RecordingStatus } from '../types/index.ts';

interface UseProctoringOptions {
  sessionId: string;
  enabled: boolean;
  fullscreenRequired: boolean;
  cameraRequired?: boolean;
  recordExamVideo?: boolean;
  maxViolations: number;
  currentQuestionId?: string;
  onAutoSubmit?: (reason: string, resultId?: string) => void;
  onWarning?: (message: string, count: number, max: number) => void;
}

export interface ProctoringState {
  isFullscreen: boolean;
  cameraStream: MediaStream | null;
  cameraActive: boolean;
  cameraError: string | null;
  isOnline: boolean;
  violationCount: number;
  maxViolations: number;
  suspicionScore: number;
  proctorStatus: ProctorStatus;
  recentAlert: { message: string; timestamp: number } | null;
  warningModalOpen: boolean;
  warningModalMessage: string;
  queuedAnswersCount: number;
  recordingStatus: RecordingStatus;
  recordingId: string | null;
  uploadedChunksCount: number;
  recordingSeconds: number;
  isRecordingActive: boolean;
  recordingError: string | null;
}

export function useProctoring({
  sessionId,
  enabled,
  fullscreenRequired,
  maxViolations,
  currentQuestionId,
  onAutoSubmit,
  onWarning,
}: UseProctoringOptions) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [violationCount, setViolationCount] = useState<number>(0);
  const [suspicionScore, setSuspicionScore] = useState<number>(0);
  const [proctorStatus, setProctorStatus] = useState<ProctorStatus>('ACTIVE');
  const [recentAlert, setRecentAlert] = useState<{ message: string; timestamp: number } | null>(null);
  const [warningModalOpen, setWarningModalOpen] = useState<boolean>(false);
  const [warningModalMessage, setWarningModalMessage] = useState<string>('');
  const [queuedAnswersCount] = useState<number>(0);

  const isSubmittingRef = useRef<boolean>(false);
  const lastEventTimeRef = useRef<Record<string, number>>({});

  // Dispatch Malpractice Event to backend
  const logSecurityEvent = useCallback(
    async (eventType: MalpracticeEventType, description?: string) => {
      if (!enabled || isSubmittingRef.current) return;

      // Debounce identical rapid events (within 700ms)
      const now = Date.now();
      if (lastEventTimeRef.current[eventType] && now - lastEventTimeRef.current[eventType] < 700) {
        return;
      }
      lastEventTimeRef.current[eventType] = now;

      try {
        const res = await api.sendSecurityEvent(sessionId, {
          eventType,
          description: description || `Proctoring alert: ${eventType}`,
          currentQuestionId,
          browserInfo: `${navigator.userAgent} (${window.innerWidth}x${window.innerHeight})`,
        });

        setViolationCount(res.currentViolations);
        setSuspicionScore(res.suspicionScore);
        setProctorStatus(res.proctorStatus as ProctorStatus);

        const alertMsg = res.warningMessage || `Security alert: ${eventType.replace(/_/g, ' ')}`;
        setRecentAlert({ message: alertMsg, timestamp: Date.now() });

        if (res.autoSubmitted) {
          isSubmittingRef.current = true;
          setWarningModalOpen(false);
          if (onAutoSubmit) {
            onAutoSubmit('Maximum security violations reached. Examination auto-submitted.', res.resultId);
          }
        } else if (res.warningMessage) {
          setWarningModalMessage(res.warningMessage);
          setWarningModalOpen(true);
          if (onWarning) {
            onWarning(res.warningMessage, res.currentViolations, res.maxViolations);
          }
        }
      } catch (err) {
        console.warn('Failed to dispatch security event to server:', err);
      }
    },
    [enabled, sessionId, currentQuestionId, onAutoSubmit, onWarning]
  );

  // Fullscreen toggle request
  const requestFullscreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
      setWarningModalOpen(false);
    } catch (err) {
      console.warn('Fullscreen request rejected or blocked by browser policy:', err);
    }
  }, []);

  const finalizeRecording = useCallback(async () => {
    // No-op since webcam is disabled
  }, []);

  // Event Listeners for Anti-Malpractice & Integrity Protection
  useEffect(() => {
    if (!enabled) return;

    // 1. Page Visibility & Tab Switch
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logSecurityEvent('TAB_SWITCH', 'Student navigated away to another browser tab or minimized window.');
      }
    };

    // 2. Window Blur & Focus
    const handleWindowBlur = () => {
      logSecurityEvent('WINDOW_BLUR', 'Examination window lost focus.');
    };
    const handleWindowFocus = () => {
      logSecurityEvent('WINDOW_FOCUS_RETURN', 'Examination window regained focus.');
    };

    // 3. Fullscreen Changes
    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull && fullscreenRequired) {
        logSecurityEvent('FULLSCREEN_EXIT', 'Student exited forced fullscreen examination mode.');
        setWarningModalMessage('Fullscreen mode is required. Please restore fullscreen to continue your test.');
        setWarningModalOpen(true);
      }
    };

    // 4. Copy, Cut, Paste prevention
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      logSecurityEvent('COPY_ATTEMPT', 'Unauthorized text copy (Ctrl+C / Copy) attempt detected.');
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      logSecurityEvent('PASTE_ATTEMPT', 'Unauthorized text paste (Ctrl+V / Paste) attempt detected.');
    };
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      logSecurityEvent('CUT_ATTEMPT', 'Unauthorized text cut (Ctrl+X / Cut) attempt detected.');
    };

    // 5. Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      logSecurityEvent('CONTEXT_MENU_ATTEMPT', 'Unauthorized right-click / context menu action detected.');
    };

    // 6. Keyboard Shortcuts Protection
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Specifically handle Copy (Ctrl+C / Cmd+C)
      if (isCtrlOrMeta && key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        logSecurityEvent('COPY_ATTEMPT', 'Prohibited keyboard shortcut: Copy (Ctrl+C / Cmd+C).');
        return;
      }

      // Specifically handle Paste (Ctrl+V / Cmd+V)
      if (isCtrlOrMeta && key === 'v') {
        e.preventDefault();
        e.stopPropagation();
        logSecurityEvent('PASTE_ATTEMPT', 'Prohibited keyboard shortcut: Paste (Ctrl+V / Cmd+V).');
        return;
      }

      // Specifically handle Cut (Ctrl+X / Cmd+X)
      if (isCtrlOrMeta && key === 'x') {
        e.preventDefault();
        e.stopPropagation();
        logSecurityEvent('CUT_ATTEMPT', 'Prohibited keyboard shortcut: Cut (Ctrl+X / Cmd+X).');
        return;
      }

      // Block Screenshot / Screen Capture / Snipping Tool (PrintScreen, Win+Shift+S, Cmd+Shift+3/4/5)
      if (
        e.key === 'PrintScreen' ||
        key === 'printscreen' ||
        (isCtrlOrMeta && e.shiftKey && ['3', '4', '5', 's'].includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        logSecurityEvent(
          'SCREEN_PHOTO_CAPTURE_ATTEMPT',
          `Prohibited screen capture shortcut triggered (${e.key}). Capturing question images is strictly forbidden.`
        );
        return;
      }

      // Block other restricted shortcuts: Ctrl+P (Print), Ctrl+S (Save), Ctrl+U (Source)
      if (isCtrlOrMeta && ['p', 's', 'u'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        logSecurityEvent(
          'KEYBOARD_SHORTCUT_BLOCKED',
          `Prohibited keyboard shortcut: ${e.ctrlKey ? 'Ctrl' : 'Cmd'}+${key.toUpperCase()}`
        );
        return;
      }

      // Block Devtools: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (
        e.key === 'F12' ||
        (isCtrlOrMeta && e.shiftKey && ['i', 'j', 'c'].includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        logSecurityEvent(
          'DEVTOOLS_SUSPECTED',
          `Blocked developer inspection shortcut (${e.key}).`
        );
        return;
      }
    };

    // 7. Network status monitoring
    const handleOnline = () => {
      setIsOnline(true);
      logSecurityEvent('NETWORK_RECONNECTED', 'Network connection restored.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      logSecurityEvent('NETWORK_DISCONNECTED', 'Network connection dropped. Operating in local offline mode.');
    };

    // 8. Heuristic Devtools dimension check
    const devtoolsCheckInterval = setInterval(() => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if (widthThreshold || heightThreshold) {
        logSecurityEvent('DEVTOOLS_SUSPECTED', 'Browser viewport heuristic indicates possible open developer tools.');
      }
    }, 8000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(devtoolsCheckInterval);
    };
  }, [enabled, fullscreenRequired, logSecurityEvent]);

  // Periodic heartbeat sync with server
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.sendHeartbeat(sessionId, {
          cameraActive: false,
          fullscreenActive: isFullscreen,
        });

        if (res.isTerminated && onAutoSubmit) {
          onAutoSubmit('Exam session was finalized or terminated on the server.');
        }
      } catch (err) {
        console.warn('Heartbeat error:', err);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [enabled, sessionId, isFullscreen, onAutoSubmit]);

  const dismissWarningModal = () => {
    setWarningModalOpen(false);
    if (fullscreenRequired && !isFullscreen) {
      requestFullscreen();
    }
  };

  const simulateTabSwitch = useCallback(() => {
    logSecurityEvent(
      'TAB_SWITCH',
      'Test simulation: Candidate switched away to an external browser tab or application.'
    );
  }, [logSecurityEvent]);

  const simulateCopyPaste = useCallback(() => {
    logSecurityEvent(
      'COPY_ATTEMPT',
      'Test simulation: Unauthorized text copy / paste detected.'
    );
  }, [logSecurityEvent]);

  return {
    isFullscreen,
    cameraStream: null,
    cameraActive: false,
    isVirtualCamera: false,
    cameraError: null,
    isOnline,
    violationCount,
    maxViolations,
    suspicionScore,
    proctorStatus,
    recentAlert,
    warningModalOpen,
    warningModalMessage,
    queuedAnswersCount,
    detectedPersonCount: 1,
    personStatus: 'VERIFIED' as const,
    mobileDetected: false,
    photoCaptureDetected: false,
    recordingStatus: 'COMPLETED' as RecordingStatus,
    recordingId: null,
    uploadedChunksCount: 0,
    recordingSeconds: 0,
    isRecordingActive: false,
    recordingError: null,
    finalizeRecording,
    toggleCameraSource: () => {},
    simulateMultiplePersons: simulateTabSwitch,
    simulateMobilePhoneDetected: simulateTabSwitch,
    simulatePhotoCapture: simulateCopyPaste,
    requestFullscreen,
    dismissWarningModal,
    logSecurityEvent,
  };
}
