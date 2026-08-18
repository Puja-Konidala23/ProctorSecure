import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Camera,
  Maximize2,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Play,
  CheckCircle2,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  Code2,
  ListOrdered,
  RefreshCw,
  Terminal,
  FileCheck2,
  RotateCcw,
  Smartphone,
  Eye,
  Video,
  Radio,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useProctoring } from '../../hooks/useProctoring.ts';
import type { Question, StudentAnswer, ExamResult } from '../../types/index.ts';

interface ExamRoomProps {
  sessionId: string;
  onExamCompleted: (resultId: string) => void;
  onExit: () => void;
}

export const ExamRoom: React.FC<ExamRoomProps> = ({
  sessionId,
  onExamCompleted,
  onExit,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<any>(null);
  const [examSettings, setExamSettings] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);

  // Student Answers
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [saveStatus, setSaveStatus] = useState<'SAVED' | 'SAVING' | 'OFFLINE_SAVED'>('SAVED');

  // Server Countdown Timer
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Coding Sandbox execution state
  const [activeLanguage, setActiveLanguage] = useState<string>('javascript');
  const [customInput, setCustomInput] = useState<string>('');
  const [runLoading, setRunLoading] = useState<boolean>(false);
  const [runOutput, setRunOutput] = useState<{ stdout?: string; stderr?: string; executionTimeMs?: number; status?: string } | null>(null);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [testingCode, setTestingCode] = useState<boolean>(false);

  // Modals & Overlays
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [autoSubmitMessage, setAutoSubmitMessage] = useState<string | null>(null);

  const currentQuestion = questions[currentQuestionIdx];

  // Initialize Proctoring Engine Hook
  const {
    isFullscreen,
    isOnline,
    violationCount,
    maxViolations,
    suspicionScore,
    proctorStatus,
    recentAlert,
    warningModalOpen,
    warningModalMessage,
    finalizeRecording,
    simulateMultiplePersons,
    simulateMobilePhoneDetected,
    simulatePhotoCapture,
    requestFullscreen,
    dismissWarningModal,
    logSecurityEvent,
  } = useProctoring({
    sessionId,
    enabled: !loading && !autoSubmitMessage && session?.status === 'IN_PROGRESS',
    fullscreenRequired: examSettings?.fullscreenRequired ?? true,
    maxViolations: examSettings?.maxViolations || 3,
    currentQuestionId: currentQuestion?.id,
    onAutoSubmit: (reason, resultId) => {
      setAutoSubmitMessage(reason);
      if (resultId) {
        setTimeout(() => onExamCompleted(resultId), 3500);
      }
    },
  });

  // Fetch initial exam session payload
  useEffect(() => {
    async function loadSession() {
      try {
        const data = await api.getExamSession(sessionId);
        if (data.isExpired && data.resultId) {
          onExamCompleted(data.resultId);
          return;
        }

        setSession(data.session);
        setExamSettings(data.examSettings);
        setQuestions(data.questions);
        setAnswers(data.session.answers || {});
        setRemainingSeconds(data.session.remainingSeconds || 0);

        // Attempt initial fullscreen automatically
        if (data.examSettings?.fullscreenRequired) {
          requestFullscreen();
        }
      } catch (err: any) {
        console.error('Failed to load session:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [sessionId, onExamCompleted, requestFullscreen]);

  // Local accurate countdown timer ticking
  useEffect(() => {
    if (loading || remainingSeconds <= 0 || autoSubmitMessage) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmitTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, remainingSeconds, autoSubmitMessage]);

  const handleAutoSubmitTimeExpired = async () => {
    setAutoSubmitMessage('Examination time has expired. Your answers are being submitted automatically.');
    try {
      await finalizeRecording().catch(() => {});
      const res = await api.submitExam(sessionId);
      setTimeout(() => onExamCompleted(res.resultId), 3000);
    } catch (e) {
      console.warn('Auto submit failed:', e);
    }
  };

  // Debounced Answer Auto-save
  const saveAnswerState = useCallback(
    async (questionId: string, updatedAnswer: StudentAnswer) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: updatedAnswer,
      }));

      setSaveStatus(isOnline ? 'SAVING' : 'OFFLINE_SAVED');

      if (!isOnline) {
        // Queue locally
        localStorage.setItem(`offline_ans_${sessionId}_${questionId}`, JSON.stringify(updatedAnswer));
        return;
      }

      try {
        await api.saveAnswer(sessionId, {
          questionId,
          selectedOptionId: updatedAnswer.selectedOptionId,
          textAnswer: updatedAnswer.textAnswer,
          codeAnswer: updatedAnswer.codeAnswer,
          codeLanguage: updatedAnswer.codeLanguage,
          isFlagged: updatedAnswer.isFlagged,
        });
        setSaveStatus('SAVED');
      } catch (err) {
        console.warn('Auto-save error, stored locally in memory:', err);
        setSaveStatus('OFFLINE_SAVED');
      }
    },
    [sessionId, isOnline]
  );

  // MCQ Selection handler
  const handleSelectOption = (optionId: string) => {
    if (!currentQuestion) return;
    const current = answers[currentQuestion.id] || {
      questionId: currentQuestion.id,
      updatedAt: new Date().toISOString(),
    };
    const updated = {
      ...current,
      selectedOptionId: optionId,
      updatedAt: new Date().toISOString(),
    };
    saveAnswerState(currentQuestion.id, updated);
  };

  // Coding answer change handler
  const handleCodeChange = (code: string) => {
    if (!currentQuestion) return;
    const current = answers[currentQuestion.id] || {
      questionId: currentQuestion.id,
      updatedAt: new Date().toISOString(),
    };
    const updated = {
      ...current,
      codeAnswer: code,
      codeLanguage: activeLanguage,
      updatedAt: new Date().toISOString(),
    };
    saveAnswerState(currentQuestion.id, updated);
  };

  // Language change handler with starter code synchronization
  const handleLanguageChange = (newLanguage: string) => {
    setActiveLanguage(newLanguage);
    if (!currentQuestion) return;

    // Check if student has current customized code or if it's default
    const existingCode = answers[currentQuestion.id]?.codeAnswer;
    const starterForNewLang = currentQuestion.starterCode?.[newLanguage] || '';

    // If no existing code or existing code matches one of other starter codes, update to new language starter code
    const isStarterMatch = Object.values(currentQuestion.starterCode || {}).some(
      (code) => typeof code === 'string' && code.trim() === existingCode?.trim()
    );

    if (!existingCode || isStarterMatch) {
      handleCodeChange(starterForNewLang);
    } else {
      // Just update language tag
      const current = answers[currentQuestion.id] || {
        questionId: currentQuestion.id,
        updatedAt: new Date().toISOString(),
      };
      saveAnswerState(currentQuestion.id, {
        ...current,
        codeLanguage: newLanguage,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Reset to starter template for active language
  const handleResetStarterCode = () => {
    if (!currentQuestion) return;
    const starter = currentQuestion.starterCode?.[activeLanguage] || '';
    handleCodeChange(starter);
    setRunOutput(null);
    setTestResults(null);
  };

  // Flag for review toggle
  const handleToggleFlag = () => {
    if (!currentQuestion) return;
    const current = answers[currentQuestion.id] || {
      questionId: currentQuestion.id,
      updatedAt: new Date().toISOString(),
    };
    const updated = {
      ...current,
      isFlagged: !current.isFlagged,
      updatedAt: new Date().toISOString(),
    };
    saveAnswerState(currentQuestion.id, updated);
  };

  // Run student code in sandbox
  const handleRunCode = async () => {
    if (!currentQuestion) return;
    const codeToRun =
      answers[currentQuestion.id]?.codeAnswer ??
      currentQuestion.starterCode?.[activeLanguage] ??
      '';

    setRunLoading(true);
    setRunOutput(null);
    try {
      const res = await api.runCode(codeToRun, activeLanguage, customInput);
      setRunOutput(res);
    } catch (err: any) {
      setRunOutput({
        status: 'ERROR',
        stderr: err?.message || 'Failed to execute code in sandbox environment.',
      });
    } finally {
      setRunLoading(false);
    }
  };

  // Test code against sample test cases
  const handleTestAgainstSampleCases = async () => {
    if (!currentQuestion) return;
    const codeToTest =
      answers[currentQuestion.id]?.codeAnswer ??
      currentQuestion.starterCode?.[activeLanguage] ??
      '';

    setTestingCode(true);
    setTestResults(null);
    try {
      const res = await api.testCode(codeToTest, activeLanguage, currentQuestion.id);
      setTestResults(res.testCaseResults);
      if ((res as any).isSyntaxError) {
        setRunOutput({
          status: 'COMPILATION_ERROR',
          stderr: (res as any).syntaxError || 'Syntax / Compilation error detected in your code.',
        });
      }
    } catch (err: any) {
      console.warn('Testing error:', err);
    } finally {
      setTestingCode(false);
    }
  };

  // Manual Submission Confirmation
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      await finalizeRecording().catch(() => {});
      const res = await api.submitExam(sessionId);
      onExamCompleted(res.resultId);
    } catch (err: any) {
      alert(`Submission error: ${err?.message || 'Please try again.'}`);
      setIsSubmitting(false);
    }
  };

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1113] flex flex-col items-center justify-center text-[#E0E0E0]">
        <div className="animate-spin h-12 w-12 border-4 border-[#3B82F6] border-t-transparent rounded-full mb-4"></div>
        <h2 className="text-lg font-bold text-white">Connecting to Secure Examination Room...</h2>
        <p className="text-xs text-[#A0A0A0] mt-1">Synchronizing timers, questions, and camera feeds</p>
      </div>
    );
  }

  // Answer statistics
  const totalQuestions = questions.length;
  const answerList = Object.values(answers) as StudentAnswer[];
  const answeredCount = answerList.filter(
    (a) => a.selectedOptionId || (a.codeAnswer && a.codeAnswer.trim().length > 0)
  ).length;
  const flaggedCount = answerList.filter((a) => a.isFlagged).length;
  const unansweredCount = totalQuestions - answeredCount;

  // Active Code for current question
  const currentCode =
    answers[currentQuestion?.id]?.codeAnswer ??
    currentQuestion?.starterCode?.[activeLanguage] ??
    '// Write your solution here\nfunction solve(input) {\n  return "";\n}';

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0F1113] text-[#E0E0E0] select-none overflow-hidden font-sans">
      {/* ======================================================== */}
      {/* TOP HEADER: EXAM TITLE, CONNECTION & PROCTOR STATUS */}
      {/* ======================================================== */}
      <header className="h-14 shrink-0 bg-[#14171A] border-b border-[#2C2F33] text-white px-4 sm:px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B82F6] text-white font-bold shadow-md shadow-blue-900/20">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-xs sm:max-w-md">
              {session?.examTitle}
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-[#A0A0A0]">
              <span>Candidate: <strong className="text-white">{session?.studentName}</strong></span>
              <span>•</span>
              <span>Total Marks: {examSettings?.totalMarks || 28}</span>
            </div>
          </div>
        </div>

        {/* Middle Status Badge: SECURITY ACTIVE / WARNING */}
        <div className="hidden md:flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              proctorStatus === 'ACTIVE'
                ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30'
                : proctorStatus === 'WARNING'
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30 animate-pulse'
                : 'bg-[#EF4444]/20 text-[#F87171] border-[#EF4444]/30 animate-bounce'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                proctorStatus === 'ACTIVE' ? 'bg-[#10B981]' : 'bg-[#EF4444]'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                proctorStatus === 'ACTIVE' ? 'bg-[#10B981]' : 'bg-[#EF4444]'
              }`}></span>
            </span>
            <span>
              {proctorStatus === 'ACTIVE'
                ? 'PROCTORING ACTIVE'
                : proctorStatus === 'WARNING'
                ? 'SECURITY WARNING'
                : 'SECURITY ALERT'}
            </span>
          </div>

          {/* Auto-save status */}
          <div className="text-[11px] text-[#A0A0A0] flex items-center gap-1.5">
            {saveStatus === 'SAVING' ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin text-[#3B82F6]" />
                <span>Saving...</span>
              </>
            ) : saveStatus === 'OFFLINE_SAVED' ? (
              <>
                <WifiOff className="h-3 w-3 text-[#F59E0B]" />
                <span className="text-[#F59E0B]">Offline — saved locally</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                <span className="text-[#A0A0A0]">Answers Saved</span>
              </>
            )}
          </div>
        </div>

        {/* Right Timer Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-bold border ${
              remainingSeconds < 180
                ? 'bg-[#EF4444]/20 text-[#F87171] border-[#EF4444]/40 animate-pulse'
                : remainingSeconds < 600
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40'
                : 'bg-[#1A1D1F] text-white border-[#2C2F33]'
            }`}
          >
            <Clock className="h-4 w-4 text-[#3B82F6]" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          <button
            onClick={() => setSubmitConfirmOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold transition shadow-md shadow-blue-900/20"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Finish & Submit</span>
          </button>
        </div>
      </header>

      {/* Real-time Floating Security Alert Toast */}
      {recentAlert && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#EF4444] text-white shadow-2xl border border-red-400 font-medium text-xs">
            <ShieldAlert className="h-4 w-4 shrink-0 animate-bounce" />
            <span className="font-semibold">{recentAlert.message}</span>
            <span className="bg-black/30 px-2 py-0.5 rounded-md text-[10px] font-mono shrink-0">
              {violationCount}/{maxViolations} Violations
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3-COLUMN MAIN LAYOUT */}
      {/* ======================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ---------------------------------------------------- */}
        {/* COLUMN 1: LEFT QUESTION PALETTE */}
        {/* ---------------------------------------------------- */}
        <aside className="w-64 shrink-0 bg-[#14171A] border-r border-[#2C2F33] p-4 flex flex-col justify-between hidden lg:flex">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#2C2F33] pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3B82F6] flex items-center gap-1.5">
                <ListOrdered className="h-4 w-4 text-[#3B82F6]" />
                Question Palette
              </span>
              <span className="text-[11px] font-semibold text-[#A0A0A0]">
                {answeredCount}/{totalQuestions} Answered
              </span>
            </div>

            {/* Questions Grid */}
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const answer = answers[q.id];
                const isAnswered = !!(answer?.selectedOptionId || (answer?.codeAnswer && answer.codeAnswer.trim().length > 0));
                const isFlagged = !!answer?.isFlagged;
                const isCurrent = idx === currentQuestionIdx;

                let btnBg = 'bg-[#1A1D1F] text-[#E0E0E0] border-[#2C2F33] hover:bg-[#2C2F33]';
                if (isCurrent) {
                  btnBg = 'ring-2 ring-[#3B82F6] ring-offset-1 ring-offset-[#14171A] font-bold border-[#3B82F6] bg-[#1A1D1F] text-white';
                }
                if (isFlagged) {
                  btnBg += ' bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40';
                } else if (isAnswered) {
                  btnBg += ' bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40 font-semibold';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      if (examSettings?.allowQuestionNavigation !== false) {
                        setCurrentQuestionIdx(idx);
                      }
                    }}
                    className={`h-10 rounded-lg text-xs flex flex-col items-center justify-center border transition relative ${btnBg}`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[#F59E0B]"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-2 border-t border-[#2C2F33] pt-3 text-[11px] text-[#A0A0A0]">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-md bg-[#10B981]/20 border border-[#10B981]/40 shrink-0"></span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-md bg-[#1A1D1F] border border-[#2C2F33] shrink-0"></span>
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-md bg-[#F59E0B]/20 border border-[#F59E0B]/40 shrink-0"></span>
                <span>Flagged for Review</span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts info */}
          <div className="rounded-xl bg-[#1A1D1F] border border-[#2C2F33] p-3 text-[11px] text-[#A0A0A0] space-y-1">
            <p className="font-semibold text-white">Exam Instructions</p>
            <p>Do not switch tabs or exit fullscreen mode. Real-time logging is active.</p>
          </div>
        </aside>

        {/* ---------------------------------------------------- */}
        {/* COLUMN 2: CENTER QUESTION / CODE EDITOR WORKSPACE */}
        {/* ---------------------------------------------------- */}
        <main className="flex-1 flex flex-col bg-[#0F1113] overflow-hidden">
          {currentQuestion ? (
            <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Question Header Card */}
              <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2C2F33] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-[#3B82F6]/20 px-2.5 py-1 text-xs font-bold text-[#3B82F6] border border-[#3B82F6]/30">
                      Question {currentQuestionIdx + 1} of {totalQuestions}
                    </span>
                    <span className="rounded-lg bg-[#14171A] px-2 py-0.5 text-[11px] font-semibold text-[#A0A0A0] border border-[#2C2F33]">
                      {currentQuestion.type}
                    </span>
                    <span className="rounded-lg bg-[#14171A] px-2 py-0.5 text-[11px] font-medium text-[#A0A0A0] border border-[#2C2F33]">
                      {currentQuestion.topic}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-[#10B981] bg-[#10B981]/20 px-2.5 py-1 rounded-md border border-[#10B981]/30">
                      +{currentQuestion.marks} Marks
                    </span>
                    {currentQuestion.negativeMarks ? (
                      <span className="font-semibold text-[#F87171] bg-[#EF4444]/20 px-2 py-1 rounded-md border border-[#EF4444]/30">
                        -{currentQuestion.negativeMarks} Neg
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4">
                  <h2 className="text-base font-bold text-white">{currentQuestion.title}</h2>
                  <p className="mt-2 text-xs sm:text-sm text-[#E0E0E0] leading-relaxed whitespace-pre-line">
                    {currentQuestion.description || currentQuestion.problemStatement}
                  </p>
                </div>
              </div>

              {/* ----------------- MCQ FORMAT ----------------- */}
              {currentQuestion.type === 'MCQ' && currentQuestion.options && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B82F6] px-1">
                    Select Your Answer:
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options.map((opt, optIdx) => {
                      const isSelected = answers[currentQuestion.id]?.selectedOptionId === opt.id;
                      const optLabel = String.fromCharCode(65 + optIdx); // A, B, C, D

                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(opt.id)}
                          className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#3B82F6] bg-[#3B82F6]/15 shadow-md ring-1 ring-[#3B82F6]'
                              : 'border-[#2C2F33] bg-[#1A1D1F] hover:border-[#40444B] hover:bg-[#202327]'
                          }`}
                        >
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold text-xs transition ${
                              isSelected
                                ? 'bg-[#3B82F6] text-white shadow-xs'
                                : 'bg-[#14171A] text-[#A0A0A0] border border-[#2C2F33]'
                            }`}
                          >
                            {optLabel}
                          </div>
                          <div className="flex-1 text-xs sm:text-sm font-medium text-white pt-0.5 leading-relaxed">
                            {opt.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ----------------- CODING FORMAT ----------------- */}
              {currentQuestion.type === 'CODING' && (
                <div className="space-y-4">
                  {/* Problem Constraints & Examples */}
                  {currentQuestion.examples && currentQuestion.examples.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentQuestion.examples.map((ex, i) => (
                        <div key={i} className="rounded-xl border border-[#2C2F33] bg-[#1A1D1F] p-3.5 text-xs space-y-2">
                          <div className="font-bold text-white">Example {i + 1}</div>
                          <div className="bg-[#14171A] p-2 rounded-lg font-mono text-[11px] space-y-1 border border-[#2C2F33]">
                            <div><strong className="text-[#3B82F6]">Input:</strong> {ex.input}</div>
                            <div><strong className="text-[#10B981]">Output:</strong> {ex.output}</div>
                          </div>
                          {ex.explanation && (
                            <p className="text-[11px] text-[#A0A0A0] italic">{ex.explanation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sandboxed Code Editor Header & Controls */}
                  <div className="rounded-2xl border border-[#2C2F33] bg-[#14171A] overflow-hidden shadow-2xl">
                    <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#14171A] border-b border-[#2C2F33] text-xs">
                      <div className="flex items-center gap-3">
                        <Code2 className="h-4 w-4 text-[#3B82F6]" />
                        <span className="font-bold text-white">Solution Editor</span>
                        <select
                          value={activeLanguage}
                          onChange={(e) => handleLanguageChange(e.target.value)}
                          className="rounded-md bg-[#1A1D1F] px-2.5 py-1 text-xs font-semibold text-white border border-[#2C2F33] focus:outline-hidden cursor-pointer"
                        >
                          <option value="javascript">JavaScript (Node.js)</option>
                          <option value="python">Python 3</option>
                          <option value="java">Java (JDK / OpenJDK)</option>
                        </select>

                        <button
                          type="button"
                          onClick={handleResetStarterCode}
                          title="Reset to initial boilerplate code for this language"
                          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-[#A0A0A0] hover:text-white bg-[#1A1D1F] hover:bg-[#2C2F33] border border-[#2C2F33] transition"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reset Boilerplate</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleTestAgainstSampleCases}
                          disabled={testingCode}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1D1F] hover:bg-[#2C2F33] text-[#E0E0E0] text-xs font-semibold border border-[#2C2F33] transition cursor-pointer"
                        >
                          {testingCode ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileCheck2 className="h-3.5 w-3.5 text-[#3B82F6]" />
                          )}
                          <span>Run Public Test Cases</span>
                        </button>

                        <button
                          onClick={handleRunCode}
                          disabled={runLoading}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold transition shadow-md shadow-blue-900/20 cursor-pointer"
                        >
                          {runLoading ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5 fill-current" />
                          )}
                          <span>Execute Code</span>
                        </button>
                      </div>
                    </div>

                    {/* Code Textarea Area */}
                    <div className="relative">
                      <textarea
                        value={currentCode}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        onCopy={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          logSecurityEvent('COPY_ATTEMPT', 'Copy (Ctrl+C / Copy) attempt blocked in solution editor.');
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          logSecurityEvent('PASTE_ATTEMPT', 'Paste (Ctrl+V / Paste) attempt blocked in solution editor.');
                        }}
                        onCut={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          logSecurityEvent('CUT_ATTEMPT', 'Cut (Ctrl+X / Cut) attempt blocked in solution editor.');
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          logSecurityEvent('CONTEXT_MENU_ATTEMPT', 'Right-Click context menu blocked in solution editor.');
                        }}
                        spellCheck={false}
                        className="w-full h-72 bg-[#0F1113] text-[#E0E0E0] font-mono text-xs p-4 focus:outline-hidden resize-y leading-relaxed border-b border-[#2C2F33]"
                        style={{ tabSize: 2 }}
                        placeholder={`// Write your ${activeLanguage} solution here...`}
                      />
                    </div>

                    {/* Custom Input & Output Console Drawer */}
                    <div className="border-t border-[#2C2F33] bg-[#14171A] p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0] block mb-1">
                            Custom Test Input (stdin):
                          </label>
                          <textarea
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            placeholder="Enter test input lines here..."
                            rows={2}
                            className="w-full rounded-lg bg-[#0F1113] border border-[#2C2F33] text-[#E0E0E0] font-mono text-xs p-2 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0]">
                              Execution Output ({activeLanguage.toUpperCase()}):
                            </label>
                            {runOutput?.executionTimeMs !== undefined && (
                              <span className="text-[10px] font-mono text-[#A0A0A0]">
                                Time: {runOutput.executionTimeMs}ms
                              </span>
                            )}
                          </div>
                          <div className="h-20 rounded-lg bg-[#0F1113] border border-[#2C2F33] p-2.5 font-mono text-xs overflow-y-auto text-[#E0E0E0]">
                            {runLoading ? (
                              <span className="text-[#3B82F6] flex items-center gap-1.5">
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                Compiling & executing in sandbox...
                              </span>
                            ) : runOutput ? (
                              runOutput.stderr ? (
                                <div className="space-y-1">
                                  <div className="text-[10px] font-bold text-[#F87171] uppercase tracking-wider">
                                    {runOutput.status || 'ERROR'}:
                                  </div>
                                  <pre className="text-[#F87171] whitespace-pre-wrap font-mono text-xs leading-tight">
                                    {runOutput.stderr}
                                  </pre>
                                </div>
                              ) : (
                                <pre className="text-[#10B981] whitespace-pre-wrap font-mono text-xs leading-tight">
                                  {runOutput.stdout}
                                </pre>
                              )
                            ) : (
                              <span className="text-[#808080]">Click "Execute Code" to test against custom input</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Public Test Case Results */}
                      {testResults && (
                        <div className="rounded-xl bg-[#0F1113] border border-[#2C2F33] p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-white flex items-center gap-2">
                              <span>Public Test Results:</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-[#1A1D1F] border border-[#2C2F33] text-[#A0A0A0]">
                                Language: {activeLanguage.toUpperCase()}
                              </span>
                            </span>
                            <span className={testResults.every((r) => r.passed) ? 'text-[#10B981]' : 'text-[#F59E0B]'}>
                              {testResults.filter((r) => r.passed).length}/{testResults.length} Test Cases Passed
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {testResults.map((tc, idx) => (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-lg border text-[11px] font-mono ${
                                  tc.passed
                                    ? 'bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]'
                                    : 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#F87171]'
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold mb-1">
                                  <span>Test Case #{tc.testCaseIndex}</span>
                                  <span>{tc.passed ? '✓ PASSED' : '✗ FAILED'}</span>
                                </div>
                                <div className="text-[10px] text-[#A0A0A0] space-y-0.5">
                                  <div><span className="text-white/60">Input:</span> {tc.input.replace(/\n/g, ' ')}</div>
                                  <div><span className="text-white/60">Expected:</span> {tc.expectedOutput}</div>
                                  <div className={tc.passed ? 'text-[#10B981]' : 'text-[#F87171]'}>
                                    <span className="text-white/60">Actual:</span> {tc.actualOutput}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#A0A0A0]">
              No questions found in this assessment.
            </div>
          )}

          {/* ----------------- BOTTOM CONTROLS BAR ----------------- */}
          <footer className="h-16 shrink-0 bg-[#14171A] border-t border-[#2C2F33] px-4 sm:px-6 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIdx === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#2C2F33] bg-[#1A1D1F] text-xs font-semibold text-[#E0E0E0] hover:bg-[#2C2F33] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={handleToggleFlag}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                  answers[currentQuestion?.id]?.isFlagged
                    ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40'
                    : 'bg-[#1A1D1F] text-[#E0E0E0] border-[#2C2F33] hover:bg-[#2C2F33]'
                }`}
              >
                <Flag className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span>{answers[currentQuestion?.id]?.isFlagged ? 'Flagged' : 'Flag for Review'}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {currentQuestionIdx < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIdx((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#3B82F6] text-white text-xs font-bold hover:bg-[#2563EB] transition shadow-md shadow-blue-900/20"
                >
                  <span>Save & Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => setSubmitConfirmOpen(true)}
                  className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-[#10B981] text-white text-xs font-bold hover:bg-emerald-600 transition shadow-md shadow-emerald-900/20"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Submit Exam</span>
                </button>
              )}
            </div>
          </footer>
        </main>

        {/* ---------------------------------------------------- */}
        {/* ---------------------------------------------------- */}
        {/* COLUMN 3: RIGHT INTEGRITY & SECURITY MONITOR PANEL   */}
        {/* ---------------------------------------------------- */}
        <aside className="w-72 shrink-0 bg-[#14171A] border-l border-[#2C2F33] text-white p-4 flex flex-col justify-between hidden xl:flex">
          <div className="space-y-4">
            {/* Integrity Status Tile */}
            <div className="rounded-xl border border-[#2C2F33] bg-[#1A1D1F] p-4 space-y-3 shadow-inner">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#3B82F6]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#10B981]" />
                  Exam Security Active
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                  Secured
                </span>
              </div>
              <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
                Anti-malpractice active: full-screen enforcement, tab monitoring, and shortcut locks are strictly tracked.
              </p>
            </div>

            {/* Real-time Security Status Panel */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[#3B82F6]">
                Security & Telemetry
              </div>
              <div className="rounded-xl border border-[#2C2F33] bg-[#1A1D1F] p-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#A0A0A0]">Fullscreen Lock</span>
                  <span className={`font-semibold ${isFullscreen ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                    {isFullscreen ? 'Enforced' : 'Exited'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A0A0A0]">Clipboard Guard</span>
                  <span className="font-semibold text-[#10B981]">Protected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A0A0A0]">Tab Switch Tracker</span>
                  <span className="font-semibold text-[#10B981]">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A0A0A0]">DevTools Guard</span>
                  <span className="font-semibold text-[#10B981]">Locked</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A0A0A0]">Network Sync</span>
                  <span className={`font-semibold ${isOnline ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                    {isOnline ? 'Connected' : 'Offline Mode'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#2C2F33]">
                  <span className="text-[#A0A0A0]">Violations</span>
                  <span className={`font-bold ${violationCount > 0 ? 'text-[#F87171]' : 'text-[#10B981]'}`}>
                    {violationCount} / {maxViolations} Max
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A0A0A0]">Suspicion Index</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 rounded-full bg-[#0F1113] overflow-hidden border border-[#2C2F33]">
                      <div
                        className={`h-full transition-all ${
                          suspicionScore > 60
                            ? 'bg-[#EF4444]'
                            : suspicionScore > 30
                            ? 'bg-[#F59E0B]'
                            : 'bg-[#10B981]'
                        }`}
                        style={{ width: `${Math.min(100, suspicionScore)}%` }}
                      ></div>
                    </div>
                    <span className="font-mono text-[11px] text-[#E0E0E0]">{suspicionScore}/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Security Violation Simulation */}
            <div className="space-y-1">
              <div className="text-[10px] text-[#A0A0A0] font-semibold px-0.5 uppercase tracking-wider">
                Test Integrity Violations:
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={simulateMultiplePersons}
                  className="py-1 px-2 rounded bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/30 text-[#F87171] text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer text-center"
                  title="Simulate external tab switch violation"
                >
                  <span>Tab Switch</span>
                </button>
                <button
                  type="button"
                  onClick={simulatePhotoCapture}
                  className="py-1 px-2 rounded bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/30 text-[#F87171] text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer text-center"
                  title="Simulate copy-paste violation"
                >
                  <span>Copy/Paste</span>
                </button>
              </div>
            </div>

            {/* Fullscreen Restore Button if exited */}
            {!isFullscreen && examSettings?.fullscreenRequired && (
              <button
                onClick={requestFullscreen}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#F59E0B] hover:bg-amber-600 text-black text-xs font-bold transition shadow-xs animate-pulse cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Restore Fullscreen</span>
              </button>
            )}
          </div>

          <div className="text-[10px] text-[#808080] border-t border-[#2C2F33] pt-3">
            Exam ID: {sessionId.slice(0, 12)} • All security events are logged with timestamps.
          </div>
        </aside>
      </div>

      {/* ======================================================== */}
      {/* VIOLATION WARNING MODAL OVERLAY */}
      {/* ======================================================== */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#1A1D1F] p-6 shadow-2xl border-2 border-[#EF4444] text-center space-y-4 text-[#E0E0E0]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EF4444]/20 text-[#EF4444] mx-auto border border-[#EF4444]/30 animate-pulse">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#F87171] font-bold text-xs mb-2">
                Violation {violationCount} of {maxViolations} Recorded
              </div>
              <h3 className="text-base font-bold text-white">
                Proctoring Security Violation
              </h3>
              <p className="text-xs text-[#E0E0E0] mt-2 leading-relaxed bg-[#14171A] p-3 rounded-xl border border-[#2C2F33] font-medium text-left">
                {warningModalMessage || 'Prohibited action detected during examination.'}
              </p>
              <div className="mt-3 text-[11px] text-[#A0A0A0] space-y-1.5 text-left bg-[#14171A]/60 p-2.5 rounded-lg border border-[#2C2F33]">
                <div className="flex items-center gap-2 text-white font-medium">
                  <span className="text-[#EF4444]">•</span>
                  <span><strong>Fullscreen Exit:</strong> Strictly Prohibited</span>
                </div>
                <div className="flex items-center gap-2 text-white font-medium">
                  <span className="text-[#EF4444]">•</span>
                  <span><strong>Tab Switch & Window Blur:</strong> Strictly Prohibited</span>
                </div>
                <div className="flex items-center gap-2 text-white font-medium">
                  <span className="text-[#EF4444]">•</span>
                  <span><strong>Ctrl+C / Copy & Ctrl+V / Paste:</strong> Forbidden</span>
                </div>
                <div className="flex items-center gap-2 text-white font-medium">
                  <span className="text-[#EF4444]">•</span>
                  <span><strong>Right-Click (Context Menu):</strong> Forbidden</span>
                </div>
                <div className="flex items-center gap-2 text-white font-medium">
                  <span className="text-[#EF4444]">•</span>
                  <span><strong>Developer Tools & Inspection:</strong> Blocked</span>
                </div>
                <p className="text-[#F87171] font-semibold pt-1 text-[11px]">
                  Accumulating {maxViolations} violations will permanently lock and auto-submit your exam.
                </p>
              </div>
            </div>
            <button
              onClick={dismissWarningModal}
              className="w-full py-2.5 rounded-xl bg-[#3B82F6] text-white text-xs font-bold hover:bg-[#2563EB] transition cursor-pointer shadow-lg shadow-blue-900/20"
            >
              I Understand & Resume Examination
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* AUTO-SUBMIT NOTIFICATION OVERLAY */}
      {/* ======================================================== */}
      {autoSubmitMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#1A1D1F] p-8 text-center space-y-4 shadow-2xl border border-[#EF4444]/40 text-[#E0E0E0]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EF4444]/20 text-[#EF4444] mx-auto border border-[#EF4444]/30">
              <AlertTriangle className="h-8 w-8 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-white">Exam Terminated</h3>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">{autoSubmitMessage}</p>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#3B82F6]">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Redirecting to result review...</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FINAL SUBMIT CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {submitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#1A1D1F] p-6 shadow-2xl border border-[#2C2F33] space-y-5 text-[#E0E0E0]">
            <div className="flex items-center gap-3 border-b border-[#2C2F33] pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Submit Examination</h3>
                <p className="text-xs text-[#A0A0A0]">Please review your submission summary</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-[#14171A] border border-[#2C2F33]">
                <div className="text-lg font-bold text-[#10B981]">{answeredCount}</div>
                <div className="text-[10px] font-semibold text-[#A0A0A0]">Answered</div>
              </div>
              <div className="p-3 rounded-xl bg-[#14171A] border border-[#2C2F33]">
                <div className="text-lg font-bold text-white">{unansweredCount}</div>
                <div className="text-[10px] font-semibold text-[#A0A0A0]">Unanswered</div>
              </div>
              <div className="p-3 rounded-xl bg-[#14171A] border border-[#2C2F33]">
                <div className="text-lg font-bold text-[#F59E0B]">{flaggedCount}</div>
                <div className="text-[10px] font-semibold text-[#A0A0A0]">Flagged</div>
              </div>
            </div>

            <div className="text-xs text-[#A0A0A0] space-y-1">
              <p>• Remaining Time: <strong className="text-white">{formatTime(remainingSeconds)}</strong></p>
              <p>• Security Warnings: <strong className="text-white">{violationCount} / {maxViolations}</strong></p>
              <p className="text-[11px] text-[#808080] pt-1">
                Once submitted, your session will be locked and answers will be evaluated server-side.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isSubmitting}
                onClick={() => setSubmitConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#A0A0A0] hover:text-white"
              >
                Return to Exam
              </button>

              <button
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                className="px-5 py-2.5 rounded-xl bg-[#10B981] text-white text-xs font-bold hover:bg-emerald-600 transition shadow-md flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Grading & Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm Final Submission</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
