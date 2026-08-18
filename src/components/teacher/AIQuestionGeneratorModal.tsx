import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Code2,
  ListOrdered,
  X,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { Question } from '../../types/index.ts';

interface AIQuestionGeneratorModalProps {
  onClose: () => void;
  onAddQuestions: (questions: Question[]) => void;
  defaultSubject?: string;
}

export const AIQuestionGeneratorModal: React.FC<AIQuestionGeneratorModalProps> = ({
  onClose,
  onAddQuestions,
  defaultSubject = 'Computer Science & Engineering',
}) => {
  const [subject, setSubject] = useState<string>(defaultSubject);
  const [topic, setTopic] = useState<string>('Dynamic Programming & Graph Algorithms');
  const [difficulty, setDifficulty] = useState<string>('MEDIUM');
  const [questionType, setQuestionType] = useState<'MCQ' | 'CODING'>('MCQ');
  const [numberOfQuestions, setNumberOfQuestions] = useState<number>(3);
  const [marks, setMarks] = useState<number>(4);

  const [loading, setLoading] = useState<boolean>(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!subject || !topic) {
      setError('Please provide both Subject and Topic.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.generateQuestions({
        subject,
        topic,
        difficulty,
        numberOfQuestions,
        questionType,
        marks,
      });
      setGeneratedQuestions(res.questions || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (index: number) => {
    setGeneratedQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionTextChange = (index: number, newTitle: string, newDesc: string) => {
    setGeneratedQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, title: newTitle, description: newDesc } : q))
    );
  };

  const handleApproveAll = () => {
    if (generatedQuestions.length === 0) return;
    onAddQuestions(generatedQuestions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-[#1A1D1F] text-[#E0E0E0] shadow-2xl border border-[#2C2F33] overflow-hidden my-8 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#14171A] px-6 py-5 border-b border-[#2C2F33] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6] text-white shadow-md shadow-blue-900/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI Question Authoring Studio</h2>
              <p className="text-xs text-[#A0A0A0]">
                Powered by Gemini 2.5 Flash • Generates rigorous college examination problems
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#A0A0A0] hover:bg-[#2C2F33] hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl bg-[#EF4444]/20 border border-[#EF4444]/40 p-4 text-xs text-[#F87171] flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-[#EF4444]" />
              <span>{error}</span>
            </div>
          )}

          {/* Generator Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#14171A] p-4 rounded-2xl border border-[#2C2F33] text-xs">
            <div>
              <label className="block font-bold text-[#A0A0A0] mb-1">Subject Domain</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Computer Networks, DBMS"
                className="w-full rounded-xl border border-[#2C2F33] bg-[#0F1113] px-3 py-2 text-xs text-white placeholder-[#808080] focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#A0A0A0] mb-1">Specific Topic / Sub-domain</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. B-Trees, TCP Congestion Control"
                className="w-full rounded-xl border border-[#2C2F33] bg-[#0F1113] px-3 py-2 text-xs text-white placeholder-[#808080] focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#A0A0A0] mb-1">Question Format</label>
              <select
                value={questionType}
                onChange={(e) => {
                  const type = e.target.value as 'MCQ' | 'CODING';
                  setQuestionType(type);
                  setMarks(type === 'MCQ' ? 4 : 10);
                }}
                className="w-full rounded-xl border border-[#2C2F33] bg-[#0F1113] px-3 py-2 text-xs font-semibold text-white focus:outline-hidden focus:border-[#3B82F6]"
              >
                <option value="MCQ" className="bg-[#1A1D1F] text-white">Multiple Choice (MCQ)</option>
                <option value="CODING" className="bg-[#1A1D1F] text-white">Live Algorithmic Coding Problem</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#A0A0A0] mb-1">Academic Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded-xl border border-[#2C2F33] bg-[#0F1113] px-3 py-2 text-xs font-semibold text-white focus:outline-hidden focus:border-[#3B82F6]"
              >
                <option value="EASY" className="bg-[#1A1D1F] text-white">Easy (Fundamental Concepts)</option>
                <option value="MEDIUM" className="bg-[#1A1D1F] text-white">Medium (Analytical & Design)</option>
                <option value="HARD" className="bg-[#1A1D1F] text-white">Hard (Advanced Rigor & Optimization)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#A0A0A0] mb-1">Number of Questions</label>
              <select
                value={numberOfQuestions}
                onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                className="w-full rounded-xl border border-[#2C2F33] bg-[#0F1113] px-3 py-2 text-xs font-semibold text-white focus:outline-hidden focus:border-[#3B82F6]"
              >
                <option value={1} className="bg-[#1A1D1F] text-white">1 Question</option>
                <option value={2} className="bg-[#1A1D1F] text-white">2 Questions</option>
                <option value={3} className="bg-[#1A1D1F] text-white">3 Questions</option>
                <option value={5} className="bg-[#1A1D1F] text-white">5 Questions</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#A0A0A0] mb-1">Marks per Question</label>
              <input
                type="number"
                value={marks}
                onChange={(e) => setMarks(Number(e.target.value))}
                min={1}
                max={50}
                className="w-full rounded-xl border border-[#2C2F33] bg-[#0F1113] px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold transition shadow-md shadow-blue-900/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Synthesizing Academic Problems with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Questions with AI</span>
                </>
              )}
            </button>
          </div>

          {/* Generated Questions Review Screen */}
          {generatedQuestions.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[#2C2F33]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#3B82F6] flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                  Generated Questions Review & Verification ({generatedQuestions.length})
                </h3>
                <span className="text-[11px] text-[#A0A0A0] font-medium">
                  Review & edit before publishing to question bank
                </span>
              </div>

              <div className="space-y-4">
                {generatedQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="rounded-2xl border border-[#2C2F33] bg-[#14171A] p-5 space-y-3 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-[#3B82F6]/20 text-[#3B82F6] font-bold text-xs flex items-center justify-center border border-[#3B82F6]/30">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-white">{q.title}</span>
                        <span className="rounded-md bg-[#0F1113] px-2 py-0.5 text-[10px] font-semibold text-[#A0A0A0] border border-[#2C2F33]">
                          {q.type}
                        </span>
                        <span className="rounded-md bg-[#10B981]/20 px-2 py-0.5 text-[10px] font-bold text-[#10B981] border border-[#10B981]/30">
                          {q.marks} Marks
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                          className="p-1.5 rounded-lg text-[#A0A0A0] hover:bg-[#2C2F33] hover:text-white transition"
                          title="Edit Question"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(idx)}
                          className="p-1.5 rounded-lg text-[#A0A0A0] hover:bg-[#EF4444]/20 hover:text-[#F87171] transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {editingIdx === idx ? (
                      <div className="space-y-2 text-xs pt-2">
                        <input
                          type="text"
                          value={q.title}
                          onChange={(e) => handleQuestionTextChange(idx, e.target.value, q.description || '')}
                          className="w-full p-2 border border-[#2C2F33] bg-[#0F1113] text-white rounded-lg text-xs font-bold"
                        />
                        <textarea
                          rows={3}
                          value={q.description || q.problemStatement || ''}
                          onChange={(e) => handleQuestionTextChange(idx, q.title, e.target.value)}
                          className="w-full p-2 border border-[#2C2F33] bg-[#0F1113] text-white rounded-lg text-xs"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-[#E0E0E0] leading-relaxed whitespace-pre-line">
                        {q.description || q.problemStatement}
                      </p>
                    )}

                    {/* MCQ Options Display */}
                    {q.type === 'MCQ' && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {q.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between ${
                              opt.isCorrect || opt.id === q.correctAnswer
                                ? 'bg-[#10B981]/20 border-[#10B981]/40 text-[#10B981] font-semibold'
                                : 'bg-[#0F1113] border-[#2C2F33] text-[#E0E0E0]'
                            }`}
                          >
                            <span>{opt.text}</span>
                            {(opt.isCorrect || opt.id === q.correctAnswer) && (
                              <span className="text-[10px] uppercase font-bold text-[#10B981] bg-[#10B981]/30 px-1.5 py-0.5 rounded">
                                Correct
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="rounded-xl bg-[#0F1113] p-3 text-[11px] text-[#A0A0A0] border border-[#2C2F33]">
                        <strong className="text-[#3B82F6] font-semibold">Solution Explanation: </strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-[#14171A] px-6 py-4 border-t border-[#2C2F33] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#A0A0A0] hover:text-white"
          >
            Cancel
          </button>

          {generatedQuestions.length > 0 && (
            <button
              onClick={handleApproveAll}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#10B981] text-white text-xs font-bold hover:bg-emerald-600 transition shadow-md"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Approve & Add ({generatedQuestions.length}) Questions</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
