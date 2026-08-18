import React, { useState, useEffect } from 'react';
import {
  Layers,
  BookOpen,
  Users,
  Activity,
  Plus,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  Eye,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { Exam, Question } from '../../types/index.ts';
import { AIQuestionGeneratorModal } from './AIQuestionGeneratorModal.tsx';

interface TeacherDashboardProps {
  onCreateExam: () => void;
  onLiveMonitor: () => void;
  onAnalytics: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onCreateExam,
  onLiveMonitor,
  onAnalytics,
}) => {
  const [activeTab, setActiveTab] = useState<'EXAMS' | 'QUESTION_BANK'>('EXAMS');
  const [exams, setExams] = useState<Exam[]>([]);
  const [questionBank, setQuestionBank] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examsRes, bankRes] = await Promise.all([
        api.getTeacherExams(),
        api.getQuestionBank(),
      ]);
      setExams(examsRes || []);
      setQuestionBank(bankRes || []);
    } catch (err) {
      console.warn('Failed to load teacher portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this examination?')) return;
    try {
      await api.deleteExam(id);
      fetchData();
    } catch (err: any) {
      alert(`Delete failed: ${err?.message}`);
    }
  };

  const handleAddAIQuestionsToBank = async (newQuestions: Question[]) => {
    try {
      for (const q of newQuestions) {
        await api.createQuestion(q);
      }
      fetchData();
    } catch (e) {
      console.warn('Bank save error:', e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 text-[#E0E0E0]">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2C2F33] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Faculty Examination Portal
            </h1>
            <span className="rounded-md bg-[#3B82F6]/20 px-2 py-0.5 text-xs font-bold text-[#3B82F6] border border-[#3B82F6]/30">
              Professor Dashboard
            </span>
          </div>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Author AI assessments, configure proctoring thresholds, and oversee live college examinations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#14171A] hover:bg-[#2C2F33] text-[#3B82F6] text-xs font-bold transition border border-[#2C2F33]"
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Authoring</span>
          </button>

          <button
            onClick={onCreateExam}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold transition shadow-md shadow-blue-900/20"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Exam</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
              Total Exams
            </span>
            <div className="p-2 rounded-xl bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">{exams.length}</div>
          <div className="text-[11px] text-[#A0A0A0] mt-1">Managed courses</div>
        </div>

        <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
              Active / Published
            </span>
            <div className="p-2 rounded-xl bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#10B981] mt-2">
            {exams.filter((e) => e.status === 'PUBLISHED').length}
          </div>
          <div className="text-[11px] text-[#10B981] font-semibold mt-1">Live for students</div>
        </div>

        <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
              Question Bank
            </span>
            <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">{questionBank.length}</div>
          <div className="text-[11px] text-[#A0A0A0] mt-1">Certified problems</div>
        </div>

        <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
              Live Proctoring
            </span>
            <div className="p-2 rounded-xl bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">Active</div>
          <div className="text-[11px] text-[#F59E0B] font-semibold mt-1">
            <button onClick={onLiveMonitor} className="underline hover:text-amber-400">
              Open Command Center →
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-4 border-b border-[#2C2F33]">
        <button
          onClick={() => setActiveTab('EXAMS')}
          className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'EXAMS'
              ? 'border-[#3B82F6] text-[#3B82F6]'
              : 'border-transparent text-[#A0A0A0] hover:text-white'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Examinations ({exams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('QUESTION_BANK')}
          className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'QUESTION_BANK'
              ? 'border-[#3B82F6] text-[#3B82F6]'
              : 'border-transparent text-[#A0A0A0] hover:text-white'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Question Bank ({questionBank.length})</span>
        </button>
      </div>

      {/* Tab 1: Examinations */}
      {activeTab === 'EXAMS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-[#40444B] transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-[#3B82F6]/20 px-2 py-0.5 text-[10px] font-bold text-[#3B82F6] border border-[#3B82F6]/30">
                      {exam.subject}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        exam.status === 'PUBLISHED'
                          ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                          : 'bg-[#14171A] text-[#A0A0A0] border border-[#2C2F33]'
                      }`}
                    >
                      {exam.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{exam.title}</h3>
                  <p className="text-xs text-[#A0A0A0] line-clamp-2 leading-relaxed">
                    {exam.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-[#A0A0A0]">
                    <span>{exam.durationMinutes ?? exam.settings?.durationMinutes ?? 60} Mins</span>
                    <span>•</span>
                    <span>{exam.totalMarks} Marks</span>
                    <span>•</span>
                    <span>{exam.questions?.length ?? exam.questionIds?.length ?? 0} Questions</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2C2F33] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onLiveMonitor}
                      className="px-2.5 py-1.5 rounded-lg bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#F59E0B] font-bold text-xs transition flex items-center gap-1 border border-[#F59E0B]/30"
                    >
                      <Activity className="h-3.5 w-3.5" />
                      <span>Monitor</span>
                    </button>
                    <button
                      onClick={onAnalytics}
                      className="px-2.5 py-1.5 rounded-lg bg-[#3B82F6]/20 hover:bg-[#3B82F6]/30 text-[#3B82F6] font-bold text-xs transition border border-[#3B82F6]/30"
                    >
                      Results
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteExam(exam.id)}
                    className="p-1.5 rounded-lg text-[#A0A0A0] hover:bg-[#EF4444]/20 hover:text-[#F87171] transition"
                    title="Delete Exam"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Question Bank */}
      {activeTab === 'QUESTION_BANK' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-[#A0A0A0]" />
              <input
                type="text"
                placeholder="Search question bank..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#2C2F33] bg-[#14171A] text-xs text-white placeholder-[#808080] focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>

            <button
              onClick={() => setAiModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold transition shadow-md shadow-blue-900/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Generate Questions with AI</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questionBank
              .filter(
                (q) =>
                  q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (q.description && q.description.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map((q) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[#3B82F6]/20 px-2 py-0.5 text-[10px] font-bold text-[#3B82F6] border border-[#3B82F6]/30">
                        {q.type}
                      </span>
                      <span className="rounded-md bg-[#14171A] px-2 py-0.5 text-[10px] font-semibold text-[#A0A0A0] border border-[#2C2F33]">
                        {q.difficulty}
                      </span>
                      <span className="text-[10px] text-[#10B981] bg-[#10B981]/20 px-2 py-0.5 rounded font-bold border border-[#10B981]/30">
                        {q.marks} Marks
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-white">{q.title}</h3>
                  <p className="text-xs text-[#A0A0A0] line-clamp-2 leading-relaxed">
                    {q.description || q.problemStatement}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* AI Modal */}
      {aiModalOpen && (
        <AIQuestionGeneratorModal
          onClose={() => setAiModalOpen(false)}
          onAddQuestions={handleAddAIQuestionsToBank}
        />
      )}
    </div>
  );
};
