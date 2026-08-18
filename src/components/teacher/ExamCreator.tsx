import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Shield,
  Clock,
  Maximize2,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Code2,
  ListOrdered,
  Lock,
  Save,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { Question, Exam } from '../../types/index.ts';
import { AIQuestionGeneratorModal } from './AIQuestionGeneratorModal.tsx';

interface ExamCreatorProps {
  onBack: () => void;
  onExamCreated: () => void;
}

export const ExamCreator: React.FC<ExamCreatorProps> = ({ onBack, onExamCreated }) => {
  // Form State
  const [title, setTitle] = useState<string>('Advanced Computer Architecture Mid-Term');
  const [subject, setSubject] = useState<string>('CS-401 Computer Engineering');
  const [description, setDescription] = useState<string>(
    'Comprehensive evaluation covering pipelining hazards, cache memory hierarchies, and vector execution.'
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [totalMarks, setTotalMarks] = useState<number>(30);
  const [passingMarks, setPassingMarks] = useState<number>(15);

  // Settings
  const [cameraRequired, setCameraRequired] = useState<boolean>(true);
  const [fullscreenRequired, setFullscreenRequired] = useState<boolean>(true);
  const [maxViolations, setMaxViolations] = useState<number>(3);
  const [allowQuestionNavigation, setAllowQuestionNavigation] = useState<boolean>(true);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(false);
  const [allowStudentReview, setAllowStudentReview] = useState<boolean>(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState<boolean>(true);
  const [showExplanations, setShowExplanations] = useState<boolean>(true);

  // Questions in this exam
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing bank questions for selection
  useEffect(() => {
    async function loadBank() {
      try {
        const questions = await api.getQuestionBank();
        setBankQuestions(questions);
        if (questions.length > 0) {
          // Pre-select 2 questions as standard starting set
          setSelectedQuestions(questions.slice(0, 2));
        }
      } catch (err) {
        console.warn('Bank load error:', err);
      }
    }
    loadBank();
  }, []);

  const handleAddCustomMCQ = () => {
    const newMCQ: Question = {
      id: `q_custom_${Date.now()}`,
      title: 'Branch Prediction and Pipeline Stall',
      description: 'Which branch prediction strategy relies on local 2-bit saturating counter states?',
      type: 'MCQ',
      subject: subject,
      topic: 'Pipelining',
      difficulty: 'MEDIUM',
      marks: 4,
      negativeMarks: 1,
      options: [
        { id: 'a', text: 'Bimodal 2-Bit Predictor', isCorrect: true },
        { id: 'b', text: 'Static Forward-Taken Backward-Not-Taken', isCorrect: false },
        { id: 'c', text: 'Tournament Global Correlation Predictor', isCorrect: false },
        { id: 'd', text: 'Return Address Stack', isCorrect: false },
      ],
      correctAnswer: 'a',
      explanation: 'A 2-bit saturating counter transitions between strongly/weakly taken and not taken states.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedQuestions((prev) => [...prev, newMCQ]);
  };

  const handleAddAIQuestions = (aiQuestions: Question[]) => {
    setSelectedQuestions((prev) => [...prev, ...aiQuestions]);
  };

  const handleRemoveQuestion = (id: string) => {
    setSelectedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const calculateCalculatedMarks = () => {
    return selectedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
  };

  const handlePublish = async (status: 'PUBLISHED' | 'DRAFT') => {
    if (!title || !subject) {
      setError('Please provide an examination title and subject.');
      return;
    }
    if (selectedQuestions.length === 0) {
      setError('Please attach at least one question to this examination.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const now = new Date();
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days window

      await api.createExam({
        title,
        subject,
        description,
        durationMinutes,
        totalMarks: calculateCalculatedMarks() || totalMarks,
        passingMarks,
        startDate: now.toISOString(),
        endDate: end.toISOString(),
        status,
        questionIds: selectedQuestions.map((q) => q.id),
        settings: {
          cameraRequired,
          fullscreenRequired,
          maxViolations,
          allowQuestionNavigation,
          shuffleQuestions,
          allowStudentReview,
          showCorrectAnswers,
          showExplanations,
        },
      });

      onExamCreated();
    } catch (err: any) {
      setError(err?.message || 'Failed to create exam.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 text-[#E0E0E0]">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2C2F33] pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-[#2C2F33] bg-[#1A1D1F] text-[#E0E0E0] hover:bg-[#2C2F33] hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Create College Examination
            </h1>
            <p className="text-xs text-[#A0A0A0]">
              Configure parameters, strict anti-malpractice rules, and question assets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={submitting}
            onClick={() => handlePublish('DRAFT')}
            className="px-4 py-2 rounded-xl border border-[#2C2F33] bg-[#1A1D1F] text-xs font-bold text-[#E0E0E0] hover:bg-[#2C2F33] hover:text-white transition"
          >
            Save Draft
          </button>
          <button
            disabled={submitting}
            onClick={() => handlePublish('PUBLISHED')}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold transition shadow-md shadow-blue-900/20"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Publish Examination</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-[#EF4444]/20 border border-[#EF4444]/40 p-4 text-xs text-[#F87171] flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-[#EF4444] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: 2 Columns - Left: General & Proctoring Settings, Right: Question Bank */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Exam Details & Proctoring (2 cols on lg) */}
        <div className="lg:col-span-1 space-y-6">
          {/* General Metadata */}
          <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 space-y-4 shadow-lg">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3B82F6] flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#3B82F6]" />
              General Parameters
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#A0A0A0] mb-1">Exam Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-[#2C2F33] bg-[#14171A] p-2.5 text-xs text-white focus:outline-hidden focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#A0A0A0] mb-1">Subject / Course Code</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-[#2C2F33] bg-[#14171A] p-2.5 text-xs text-white focus:outline-hidden focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#A0A0A0] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-[#2C2F33] bg-[#14171A] p-2.5 text-xs text-white focus:outline-hidden focus:border-[#3B82F6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#A0A0A0] mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    min={5}
                    className="w-full rounded-xl border border-[#2C2F33] bg-[#14171A] p-2.5 text-xs text-white focus:outline-hidden focus:border-[#3B82F6]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#A0A0A0] mb-1">Passing Marks</label>
                  <input
                    type="number"
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(Number(e.target.value))}
                    min={1}
                    className="w-full rounded-xl border border-[#2C2F33] bg-[#14171A] p-2.5 text-xs text-white focus:outline-hidden focus:border-[#3B82F6]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Anti-Malpractice & Proctoring Settings */}
          <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 space-y-4 shadow-lg">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#10B981] flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#10B981]" />
              Proctoring & Integrity Enforcement
            </h2>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-[#2C2F33] bg-[#14171A] hover:bg-[#202327] cursor-pointer">
                <div>
                  <span className="font-bold text-white block">Enforce Fullscreen Mode</span>
                  <span className="text-[11px] text-[#A0A0A0]">Log violations upon exit</span>
                </div>
                <input
                  type="checkbox"
                  checked={fullscreenRequired}
                  onChange={(e) => setFullscreenRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-[#2C2F33] bg-[#0F1113] text-[#3B82F6] focus:ring-[#3B82F6]"
                />
              </label>

              <div className="p-2.5 rounded-xl border border-[#2C2F33] bg-[#14171A] text-xs">
                <span className="font-bold text-white block">Tab & Shortcut Guard</span>
                <span className="text-[11px] text-[#A0A0A0]">Auto-detects tab switching, blur, and copy/paste</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#A0A0A0]">Max Violations Before Auto-Submit</label>
                  <span className="font-bold text-[#3B82F6]">{maxViolations} Violations</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={maxViolations}
                  onChange={(e) => setMaxViolations(Number(e.target.value))}
                  className="w-full accent-[#3B82F6]"
                />
              </div>

              <div className="pt-2 border-t border-[#2C2F33] space-y-2">
                <label className="flex items-center justify-between">
                  <span className="text-[#A0A0A0]">Allow Question Navigation</span>
                  <input
                    type="checkbox"
                    checked={allowQuestionNavigation}
                    onChange={(e) => setAllowQuestionNavigation(e.target.checked)}
                    className="h-4 w-4 rounded border-[#2C2F33] text-[#3B82F6]"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-[#A0A0A0]">Allow Post-Exam Review</span>
                  <input
                    type="checkbox"
                    checked={allowStudentReview}
                    onChange={(e) => setAllowStudentReview(e.target.checked)}
                    className="h-4 w-4 rounded border-[#2C2F33] text-[#3B82F6]"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-[#A0A0A0]">Show Solution Explanations</span>
                  <input
                    type="checkbox"
                    checked={showExplanations}
                    onChange={(e) => setShowExplanations(e.target.checked)}
                    className="h-4 w-4 rounded border-[#2C2F33] text-[#3B82F6]"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Attached Questions List & Action Bar (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 space-y-4 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2C2F33] pb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-[#3B82F6]" />
                  Examination Questions ({selectedQuestions.length})
                </h2>
                <p className="text-xs text-[#A0A0A0]">
                  Total Marks: <strong className="text-white">{calculateCalculatedMarks()}</strong>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setAiModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold transition shadow-md shadow-blue-900/20"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Generate with AI</span>
                </button>

                <button
                  onClick={handleAddCustomMCQ}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#14171A] hover:bg-[#2C2F33] text-[#E0E0E0] text-xs font-semibold border border-[#2C2F33] transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            {selectedQuestions.length > 0 ? (
              <div className="space-y-3">
                {selectedQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="rounded-xl border border-[#2C2F33] bg-[#14171A] p-4 space-y-2 hover:border-[#40444B] transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-[#3B82F6]/20 text-[#3B82F6] font-bold text-xs flex items-center justify-center border border-[#3B82F6]/30">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-white">{q.title}</span>
                        <span className="rounded-md bg-[#0F1113] px-2 py-0.5 text-[10px] font-bold text-[#A0A0A0] border border-[#2C2F33]">
                          {q.type}
                        </span>
                        <span className="text-[10px] text-[#10B981] bg-[#10B981]/20 px-2 py-0.5 rounded font-bold border border-[#10B981]/30">
                          {q.marks} Marks
                        </span>
                      </div>

                      <button
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1 rounded-lg text-[#A0A0A0] hover:bg-[#EF4444]/20 hover:text-[#F87171] transition"
                        title="Remove question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-xs text-[#A0A0A0] line-clamp-2 leading-relaxed">
                      {q.description || q.problemStatement}
                    </p>

                    {q.type === 'MCQ' && q.options && (
                      <div className="text-[11px] text-[#A0A0A0]">
                        {q.options.length} Options configured • Correct:{' '}
                        <strong className="text-[#10B981]">{q.correctAnswer}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-[#14171A] border border-dashed border-[#2C2F33] text-xs text-[#A0A0A0] space-y-3">
                <BookOpen className="h-8 w-8 text-[#808080] mx-auto" />
                <p className="font-bold text-white">No questions attached to this exam yet</p>
                <p className="text-[11px]">
                  Use the AI generator powered by Gemini or choose from your question bank.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Question Generator Modal */}
      {aiModalOpen && (
        <AIQuestionGeneratorModal
          defaultSubject={subject}
          onClose={() => setAiModalOpen(false)}
          onAddQuestions={handleAddAIQuestions}
        />
      )}
    </div>
  );
};
