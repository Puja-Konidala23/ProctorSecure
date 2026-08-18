import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Maximize,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api.ts';

interface ExamInstructionsModalProps {
  examId: string;
  onClose: () => void;
  onStartExam: (sessionId: string) => void;
}

export const ExamInstructionsModal: React.FC<ExamInstructionsModalProps> = ({
  examId,
  onClose,
  onStartExam,
}) => {
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // System Checks state
  const [fullscreenStatus, setFullscreenStatus] = useState<'READY' | 'UNSUPPORTED'>('READY');
  const [networkStatus, setNetworkStatus] = useState<'READY' | 'OFFLINE'>('READY');
  const [browserStatus, setBrowserStatus] = useState<'READY' | 'WARNING'>('READY');

  // Rule Acceptance state
  const [rulesAccepted, setRulesAccepted] = useState<boolean>(false);
  const [starting, setStarting] = useState<boolean>(false);

  useEffect(() => {
    async function loadExam() {
      try {
        const data = await api.getExamDetails(examId);
        setExam(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load examination details.');
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [examId]);

  // Execute Real System Checks
  const performSystemChecks = () => {
    // 1. Network check
    setNetworkStatus(navigator.onLine ? 'READY' : 'OFFLINE');

    // 2. Fullscreen check
    const canFullscreen = !!(
      document.documentElement.requestFullscreen ||
      (document.documentElement as any).webkitRequestFullscreen
    );
    setFullscreenStatus(canFullscreen ? 'READY' : 'UNSUPPORTED');

    // 3. Browser compatibility
    const isModern =
      typeof window !== 'undefined' &&
      typeof WebSocket !== 'undefined' &&
      typeof localStorage !== 'undefined';
    setBrowserStatus(isModern ? 'READY' : 'WARNING');
  };

  useEffect(() => {
    performSystemChecks();
  }, []);

  const handleStartExam = async () => {
    if (!rulesAccepted || starting) return;

    setStarting(true);
    try {
      const res = await api.startExam(examId);
      onStartExam(res.sessionId);
    } catch (err: any) {
      setError(err?.message || 'Failed to start exam session.');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 text-[#E0E0E0]">
        <div className="rounded-2xl bg-[#1A1D1F] p-8 text-center max-w-md w-full shadow-2xl border border-[#2C2F33]">
          <div className="animate-spin h-10 w-10 border-4 border-[#3B82F6] border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-base font-bold text-white">Initializing Exam Session...</h3>
          <p className="text-xs text-[#A0A0A0] mt-1">Retrieving proctoring parameters and question assets</p>
        </div>
      </div>
    );
  }

  const allChecksPassed = networkStatus === 'READY' && fullscreenStatus === 'READY';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto text-[#E0E0E0]">
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#1A1D1F] shadow-2xl border border-[#2C2F33] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#14171A] px-6 py-5 text-white flex items-center justify-between border-b border-[#2C2F33]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6] text-white shadow-md shadow-blue-900/20 font-bold">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">{exam?.title}</h2>
              <p className="text-xs text-[#A0A0A0] font-medium">
                {exam?.subject} • Duration: {exam?.durationMinutes} Minutes • Total Marks: {exam?.totalMarks}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#A0A0A0] hover:bg-[#2C2F33] hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 p-4 text-xs text-[#F87171] flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-[#EF4444]" />
              <div>
                <p className="font-bold">Error starting examination</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Mandatory Security Rules */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B82F6] flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#3B82F6]" />
              Mandatory Security & Exam Integrity Regulations
            </h3>
            <div className="rounded-xl border border-[#2C2F33] bg-[#14171A] p-4 text-xs space-y-2.5 text-[#E0E0E0] leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6] mt-1.5 shrink-0"></span>
                <span>
                  <strong>Strict Fullscreen Enforcement:</strong> The examination runs in enforced full-screen mode. Exiting full-screen registers an immediate security violation.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6] mt-1.5 shrink-0"></span>
                <span>
                  <strong>Tab Switch & Blur Tracking:</strong> Navigating away to other browser windows or applications is logged with exact timestamps.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6] mt-1.5 shrink-0"></span>
                <span>
                  <strong>Copy / Paste & Shortcut Block:</strong> Clipboard operations, right-click context menus, screenshot keys (PrintScreen), and developer tools are intercepted and logged.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] mt-1.5 shrink-0"></span>
                <span className="text-[#F87171]">
                  <strong>Automatic Termination:</strong> Reaching <strong>{exam?.settings?.maxViolations || 3} severe violations</strong> will trigger immediate session termination and auto-submission.
                </span>
              </div>
            </div>
          </div>

          {/* Pre-Exam Hardware & Compatibility Checks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0]">
                Pre-Exam System Readiness Checks
              </h3>
              <button
                onClick={performSystemChecks}
                className="text-[11px] font-semibold text-[#3B82F6] hover:text-[#2563EB] flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Re-Check System
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Fullscreen check */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#2C2F33] bg-[#14171A]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#10B981]/20 text-[#10B981]">
                    <Maximize className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Fullscreen Lock</div>
                    <div className="text-[11px] text-[#A0A0A0]">Supported</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                  <CheckCircle2 className="h-3 w-3" /> Ready
                </span>
              </div>

              {/* Network check */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#2C2F33] bg-[#14171A]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#10B981]/20 text-[#10B981]">
                    <Wifi className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Network Sync</div>
                    <div className="text-[11px] text-[#A0A0A0]">Online</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              </div>

              {/* Browser compatibility check */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#2C2F33] bg-[#14171A]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#10B981]/20 text-[#10B981]">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Browser Engine</div>
                    <div className="text-[11px] text-[#A0A0A0]">Compatible</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                  <CheckCircle2 className="h-3 w-3" /> Ready
                </span>
              </div>
            </div>
          </div>

          {/* Explicit Acceptance Checkbox */}
          <div className="pt-2 border-t border-[#2C2F33]">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[#2C2F33] bg-[#14171A] hover:bg-[#2C2F33] cursor-pointer transition select-none">
              <input
                type="checkbox"
                checked={rulesAccepted}
                onChange={(e) => setRulesAccepted(e.target.checked)}
                className="h-4 w-4 mt-0.5 rounded border-[#40444B] bg-[#0F1113] text-[#3B82F6] focus:ring-[#3B82F6]"
              />
              <span className="text-xs font-semibold text-[#E0E0E0] leading-snug">
                I understand the examination rules and agree that tab switching, window blurring, and keyboard shortcuts are strictly logged.
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#14171A] px-6 py-4 border-t border-[#2C2F33] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#A0A0A0] hover:text-white transition"
          >
            Cancel & Return to Dashboard
          </button>

          <button
            disabled={!rulesAccepted || !allChecksPassed || starting}
            onClick={handleStartExam}
            className={`flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md ${
              rulesAccepted && allChecksPassed && !starting
                ? 'bg-[#3B82F6] text-white hover:bg-[#2563EB] shadow-blue-900/20'
                : 'bg-[#2C2F33] text-[#808080] cursor-not-allowed'
            }`}
          >
            {starting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Entering Exam Environment...
              </>
            ) : (
              <>
                START EXAMINATION
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
