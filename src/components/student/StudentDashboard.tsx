import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Clock,
  CheckCircle,
  Award,
  ArrowRight,
  Shield,
  Calendar,
  AlertCircle,
  User,
  GraduationCap,
  Sparkles,
  Maximize2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { ExamInstructionsModal } from '../exam/ExamInstructionsModal.tsx';

interface StudentDashboardProps {
  onStartExam: (sessionId: string) => void;
  onViewResult: (resultId: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onStartExam, onViewResult }) => {
  const { user } = useAuth();
  const [data, setData] = useState<{
    available: any[];
    upcoming: any[];
    completed: any[];
    stats: any;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await api.getStudentExams();
      setData(res);
    } catch (err) {
      console.error('Failed to fetch student exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 text-[#E0E0E0]">
      {/* Student Profile & Greeting Banner */}
      <div className="rounded-3xl border border-[#2C2F33] bg-[#1A1D1F] p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3B82F6] text-white font-black text-2xl shadow-lg shadow-blue-900/20">
            {user?.name ? user.name[0].toUpperCase() : 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Welcome, {user?.name || 'Student'}
              </h1>
              <span className="rounded bg-[#10B981]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#10B981] border border-[#10B981]/30">
                Active Student
              </span>
            </div>
            <p className="text-xs text-[#A0A0A0] font-medium mt-1">
              Roll No: <strong className="text-white">{user?.studentId || 'CS2026-0842'}</strong> •{' '}
              {user?.department || 'Computer Science & Engineering'} •{' '}
              {user?.batch || 'Batch 2026'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#14171A] border border-[#2C2F33] px-4 py-2.5 rounded-2xl text-xs">
          <Shield className="h-4 w-4 text-[#3B82F6]" />
          <div className="text-left">
            <span className="font-bold text-[#E0E0E0]">Exam Environment Ready</span>
            <span className="block text-[11px] text-[#A0A0A0]">Fullscreen & Sync verified</span>
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
              Available Now
            </span>
            <div className="p-2 rounded-xl bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {data?.stats?.availableCount ?? 0}
          </div>
          <div className="text-[11px] text-[#A0A0A0] mt-1">Exams ready to take</div>
        </div>

        <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
              Upcoming
            </span>
            <div className="p-2 rounded-xl bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {data?.stats?.upcomingCount ?? 0}
          </div>
          <div className="text-[11px] text-[#A0A0A0] mt-1">Scheduled on calendar</div>
        </div>

        <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
              Completed
            </span>
            <div className="p-2 rounded-xl bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {data?.stats?.completedCount ?? 0}
          </div>
          <div className="text-[11px] text-[#A0A0A0] mt-1">Evaluated & submitted</div>
        </div>

        <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
              Average Score
            </span>
            <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {data?.stats?.averagePercentage ?? 0}%
          </div>
          <div className="text-[11px] text-[#10B981] font-semibold mt-1">Good Standing</div>
        </div>
      </div>

      {/* Available Examinations Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Available Examinations</h2>
            <p className="text-xs text-[#A0A0A0]">Live proctored exams ready for immediate commencement</p>
          </div>
          <span className="text-xs font-semibold text-[#A0A0A0]">
            {data?.available?.length || 0} active
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#A0A0A0] bg-[#1A1D1F] rounded-2xl border border-[#2C2F33]">
            Loading examinations schedule...
          </div>
        ) : data?.available && data.available.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.available.map((exam) => (
              <div
                key={exam.id}
                className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-6 shadow-lg flex flex-col justify-between space-y-4 hover:border-[#3B82F6] transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-[#3B82F6]/20 px-2.5 py-1 text-[11px] font-bold text-[#3B82F6] border border-[#3B82F6]/30">
                      {exam.subject}
                    </span>
                    <span className="text-xs font-bold text-[#E0E0E0] bg-[#14171A] px-2 py-0.5 rounded border border-[#2C2F33]">
                      {exam.totalMarks} Marks
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white leading-snug">{exam.title}</h3>
                  <p className="text-xs text-[#A0A0A0] line-clamp-2 leading-relaxed">
                    {exam.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-[#A0A0A0]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-[#808080]" />
                      {exam.durationMinutes} Minutes
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5 text-[#808080]" />
                      {exam.questionsCount} Questions
                    </span>
                    {exam.settings?.fullscreenRequired && (
                      <span className="flex items-center gap-1 text-[#3B82F6] bg-[#3B82F6]/20 px-2 py-0.5 rounded text-[10px] font-semibold border border-[#3B82F6]/30">
                        <Maximize2 className="h-3 w-3" /> Fullscreen Enforced
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2C2F33] flex items-center justify-between">
                  <div className="text-[11px] text-[#A0A0A0]">
                    Expires: {new Date(exam.endDate).toLocaleDateString()}
                  </div>

                  <button
                    onClick={() => setSelectedExamId(exam.id)}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#3B82F6] text-white text-xs font-bold hover:bg-[#2563EB] transition shadow-md shadow-blue-900/20"
                  >
                    <span>{exam.activeSessionId ? 'Resume Examination' : 'Start Examination'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-[#1A1D1F] border border-[#2C2F33] text-xs text-[#A0A0A0] space-y-1">
            <CheckCircle className="h-8 w-8 text-[#10B981] mx-auto mb-2" />
            <p className="font-bold text-white">No active examinations right now</p>
            <p>You have completed all currently assigned test modules.</p>
          </div>
        )}
      </section>

      {/* Completed Exam History Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Completed Examination History</h2>
          <p className="text-xs text-[#A0A0A0]">Verified grade sheets and performance archives</p>
        </div>

        {data?.completed && data.completed.length > 0 ? (
          <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#E0E0E0]">
                <thead className="bg-[#14171A] text-[11px] uppercase font-bold text-[#A0A0A0] border-b border-[#2C2F33]">
                  <tr>
                    <th className="px-5 py-3">Examination</th>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Score Obtained</th>
                    <th className="px-5 py-3">Percentage</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Submitted At</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2C2F33]">
                  {data.completed.map((item) => (
                    <tr key={item.id} className="hover:bg-[#14171A] transition">
                      <td className="px-5 py-3.5 font-bold text-white max-w-xs truncate">
                        {item.title}
                      </td>
                      <td className="px-5 py-3.5 text-[#A0A0A0]">{item.subject}</td>
                      <td className="px-5 py-3.5 font-semibold text-[#E0E0E0]">
                        {item.score} / {item.totalMarks}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#3B82F6]">{item.percentage}%</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.passed
                              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                              : 'bg-[#EF4444]/20 text-[#F87171] border border-[#EF4444]/30'
                          }`}
                        >
                          {item.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#A0A0A0]">
                        {new Date(item.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => onViewResult(item.resultId)}
                          className="px-3 py-1.5 rounded-lg bg-[#3B82F6]/20 hover:bg-[#3B82F6]/30 text-[#3B82F6] font-bold text-xs transition border border-[#3B82F6]/30"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center rounded-2xl bg-[#1A1D1F] border border-[#2C2F33] text-xs text-[#A0A0A0]">
            No completed exams recorded yet.
          </div>
        )}
      </section>

      {/* Pre-Exam Instructions & System Check Modal */}
      {selectedExamId && (
        <ExamInstructionsModal
          examId={selectedExamId}
          onClose={() => setSelectedExamId(null)}
          onStartExam={(sessionId) => {
            setSelectedExamId(null);
            onStartExam(sessionId);
          }}
        />
      )}
    </div>
  );
};
