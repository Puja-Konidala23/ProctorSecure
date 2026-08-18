import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  ArrowLeft,
  FileText,
  AlertTriangle,
  HelpCircle,
  Code2,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { ExamResult } from '../../types/index.ts';

interface StudentResultViewProps {
  resultId: string;
  onBack: () => void;
}

export const StudentResultView: React.FC<StudentResultViewProps> = ({ resultId, onBack }) => {
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResult() {
      try {
        const data = await api.getExamResult(resultId);
        setResult(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load examination result.');
      } finally {
        setLoading(false);
      }
    }
    loadResult();
  }, [resultId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-[#A0A0A0]">
        <div className="animate-spin h-10 w-10 border-4 border-[#3B82F6] border-t-transparent rounded-full mb-3"></div>
        <p className="text-xs font-bold text-white">Computing Score & Integrity Reports...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-xl mx-auto p-6 mt-8 rounded-2xl bg-[#1A1D1F] border border-[#2C2F33] text-center space-y-4 text-[#E0E0E0]">
        <AlertTriangle className="h-10 w-10 text-[#EF4444] mx-auto" />
        <h3 className="text-base font-bold text-white">Result Unavailable</h3>
        <p className="text-xs text-[#A0A0A0]">{error || 'Could not retrieve result details.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-xs font-bold hover:bg-[#2563EB] transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s}s`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 text-[#E0E0E0]">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold text-[#A0A0A0] hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Main Scorecard Banner */}
      <div className="rounded-3xl border border-[#2C2F33] bg-[#1A1D1F] p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2C2F33] pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30">
              Examination Report
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">{result.examTitle}</h1>
            <p className="text-xs text-[#A0A0A0]">
              Candidate: <strong className="text-white">{result.studentName}</strong> • Submitted:{' '}
              {new Date(result.submittedAt).toLocaleDateString()} at{' '}
              {new Date(result.submittedAt).toLocaleTimeString()}
            </p>
          </div>

          <div
            className={`px-5 py-2.5 rounded-2xl text-sm font-black border flex items-center gap-2 ${
              result.passed
                ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                : 'bg-[#EF4444]/20 text-[#F87171] border border-[#EF4444]/30'
            }`}
          >
            {result.passed ? (
              <>
                <Award className="h-5 w-5 text-[#10B981]" />
                <span>PASSED</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-[#EF4444]" />
                <span>NEEDS IMPROVEMENT</span>
              </>
            )}
          </div>
        </div>

        {/* 4 Metric Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-4 rounded-2xl bg-[#14171A] border border-[#2C2F33]">
            <div className="text-2xl sm:text-3xl font-black text-[#3B82F6]">
              {result.score} <span className="text-sm font-semibold text-[#808080]">/ {result.totalMarks}</span>
            </div>
            <div className="text-xs font-bold text-[#A0A0A0] mt-1">Score Obtained</div>
            <div className="text-[11px] text-[#3B82F6] font-semibold">{result.percentage}%</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#14171A] border border-[#2C2F33]">
            <div className="text-2xl sm:text-3xl font-black text-[#10B981]">
              {result.correctAnswersCount}
            </div>
            <div className="text-xs font-bold text-[#A0A0A0] mt-1">Correct Answers</div>
            <div className="text-[11px] text-[#10B981] font-semibold">Verified</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#14171A] border border-[#2C2F33]">
            <div className="text-2xl sm:text-3xl font-black text-white">
              {formatDuration(result.timeSpentSeconds)}
            </div>
            <div className="text-xs font-bold text-[#A0A0A0] mt-1">Time Elapsed</div>
            <div className="text-[11px] text-[#808080] font-medium">Recorded</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#14171A] border border-[#2C2F33]">
            <div className="text-2xl sm:text-3xl font-black text-[#F59E0B]">
              {result.violationCount}
            </div>
            <div className="text-xs font-bold text-[#A0A0A0] mt-1">Integrity Warnings</div>
            <div className="text-[11px] text-[#F59E0B] font-semibold">
              Index: {result.suspicionScore}/100
            </div>
          </div>
        </div>

        {/* Submission Mode notice */}
        {result.submissionType !== 'MANUAL' && (
          <div className="p-3.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#F59E0B] flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-[#F59E0B] shrink-0" />
            <div>
              <span className="font-bold">System Auto-Submission Triggered: </span>
              {result.submissionType === 'AUTO_TIME_EXPIRED'
                ? 'Session automatically concluded when time expired.'
                : 'Session terminated due to security threshold limit.'}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Question Review Section */}
      {result.settings?.allowStudentReview && result.questionResults ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#3B82F6] flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#3B82F6]" />
              Detailed Question Analysis & Explanations
            </h2>
            <span className="text-xs text-[#A0A0A0]">
              {result.questionResults.length} Questions Evaluated
            </span>
          </div>

          <div className="space-y-4">
            {result.questionResults.map((qr, idx) => (
              <div
                key={qr.questionId || idx}
                className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[#2C2F33] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-[#14171A] text-white font-bold text-xs flex items-center justify-center border border-[#2C2F33]">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-white">{qr.questionTitle}</span>
                    <span className="text-[10px] uppercase font-semibold text-[#A0A0A0] bg-[#14171A] px-2 py-0.5 rounded border border-[#2C2F33]">
                      {qr.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`font-bold px-2.5 py-0.5 rounded ${
                        qr.isCorrect
                          ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                          : 'bg-[#EF4444]/20 text-[#F87171] border border-[#EF4444]/30'
                      }`}
                    >
                      {qr.marksObtained} / {qr.maxMarks} Marks
                    </span>
                  </div>
                </div>

                {/* MCQ Question details */}
                {qr.type === 'MCQ' && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[#A0A0A0] font-semibold">Your Selected Response:</span>
                      <span className="font-mono bg-[#14171A] px-2 py-0.5 rounded text-[#E0E0E0] border border-[#2C2F33]">
                        {qr.selectedOptionId ? qr.selectedOptionId.toUpperCase() : '(Unanswered)'}
                      </span>
                    </div>

                    {result.settings?.showCorrectAnswers && (
                      <div className="flex items-center gap-2">
                        <span className="text-[#10B981] font-semibold">Correct Answer Key:</span>
                        <span className="font-mono bg-[#10B981]/20 text-[#10B981] font-bold px-2 py-0.5 rounded border border-[#10B981]/30">
                          {qr.correctOptionId?.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {result.settings?.showExplanations && qr.explanation && (
                      <div className="rounded-xl bg-[#14171A] border border-[#2C2F33] p-3 mt-2 text-[#E0E0E0] space-y-1">
                        <span className="font-bold text-[#3B82F6] flex items-center gap-1.5">
                          <HelpCircle className="h-3.5 w-3.5 text-[#3B82F6]" /> Academic Explanation:
                        </span>
                        <p className="text-[11px] text-[#A0A0A0] leading-relaxed">{qr.explanation}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Coding Question details */}
                {qr.type === 'CODING' && qr.codeSubmission && (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between text-[#A0A0A0] font-semibold">
                      <span>Test Cases Passed: {qr.codeSubmission.passedTestCases} / {qr.codeSubmission.totalTestCases}</span>
                      <span className="uppercase text-[10px] bg-[#14171A] px-2 py-0.5 rounded border border-[#2C2F33] text-[#E0E0E0]">
                        Language: {qr.codeSubmission.language}
                      </span>
                    </div>

                    <div className="rounded-xl bg-[#0F1113] border border-[#2C2F33] text-[#E0E0E0] p-3 font-mono text-[11px] overflow-x-auto max-h-48">
                      <pre>{qr.codeSubmission.code || '// No code submitted'}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-6 text-center text-xs text-[#A0A0A0] space-y-1">
          <p className="font-semibold text-white">Detailed Answer Review Restricted</p>
          <p>The instructor has configured this examination to protect solution confidentiality.</p>
        </div>
      )}
    </div>
  );
};
