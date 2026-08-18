import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  Search,
  Filter,
  Award,
  Users,
  Clock,
  ShieldAlert,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { ExamResult } from '../../types/index.ts';

export const TeacherAnalyticsView: React.FC = () => {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterExam, setFilterExam] = useState<string>('ALL');
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const resData = await api.getTeacherAnalytics();
      setResults(resData.results || []);
    } catch (err) {
      console.warn('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  // Compute aggregate statistics
  const totalSubmissions = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const passPercentage = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0;
  const avgScore = totalSubmissions > 0 ? Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / totalSubmissions) : 0;
  const flaggedCount = results.filter((r) => r.violationCount > 0 || r.suspicionScore > 30).length;

  const filteredResults = results.filter((r) => {
    const matchSearch =
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.examTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchExam = filterExam === 'ALL' || r.examId === filterExam;
    return matchSearch && matchExam;
  });

  const exportCSV = () => {
    if (results.length === 0) return;
    const headers = ['Student Name', 'Exam Title', 'Score', 'Total Marks', 'Percentage', 'Status', 'Violations', 'Suspicion Score', 'Submitted At'];
    const rows = results.map((r) => [
      `"${r.studentName}"`,
      `"${r.examTitle}"`,
      r.score,
      r.totalMarks,
      `${r.percentage}%`,
      r.passed ? 'PASSED' : 'FAILED',
      r.violationCount,
      r.suspicionScore,
      `"${new Date(r.submittedAt).toLocaleString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `college_exam_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 text-[#E0E0E0]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2C2F33] pb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            Examination Results & Academic Analytics
          </h1>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Grade sheet distributions, integrity verification metrics, and student performance insights
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold transition shadow-md shadow-blue-900/20"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Export Certified CSV</span>
        </button>
      </div>

      {/* 4 Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
              Total Submissions
            </span>
            <div className="p-2 rounded-xl bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">{totalSubmissions}</div>
          <div className="text-[11px] text-[#A0A0A0] mt-1">Graded candidates</div>
        </div>

        <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
              Passing Rate
            </span>
            <div className="p-2 rounded-xl bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#10B981] mt-2">{passPercentage}%</div>
          <div className="text-[11px] text-[#10B981] font-semibold mt-1">
            {passedCount} of {totalSubmissions} passed
          </div>
        </div>

        <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
              Average Score
            </span>
            <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">{avgScore}%</div>
          <div className="text-[11px] text-[#A0A0A0] mt-1">Cohort overall performance</div>
        </div>

        <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">
              Flagged Submissions
            </span>
            <div className="p-2 rounded-xl bg-[#EF4444]/20 text-[#F87171] border border-[#EF4444]/30">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#F87171] mt-2">{flaggedCount}</div>
          <div className="text-[11px] text-[#F87171] font-semibold mt-1">
            Suspicious signals logged
          </div>
        </div>
      </div>

      {/* Results Table Section */}
      <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] overflow-hidden shadow-lg space-y-4 p-5">
        {/* Table Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-[#A0A0A0]" />
            <input
              type="text"
              placeholder="Search candidate name or exam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#2C2F33] bg-[#14171A] text-xs text-white placeholder-[#808080] focus:outline-hidden focus:border-[#3B82F6]"
            />
          </div>

          <div className="text-xs text-[#A0A0A0] font-semibold">
            Showing {filteredResults.length} of {results.length} submissions
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#E0E0E0]">
            <thead className="bg-[#14171A] text-[11px] uppercase font-bold text-[#A0A0A0] border-b border-[#2C2F33]">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Examination</th>
                <th className="px-4 py-3">Score Obtained</th>
                <th className="px-4 py-3">Percentage</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Security Warnings</th>
                <th className="px-4 py-3">Submission Type</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C2F33]">
              {filteredResults.map((r) => (
                <tr key={r.id} className="hover:bg-[#14171A]/70 transition">
                  <td className="px-4 py-3.5 font-bold text-white">{r.studentName}</td>
                  <td className="px-4 py-3.5 text-[#A0A0A0] max-w-xs truncate">{r.examTitle}</td>
                  <td className="px-4 py-3.5 font-semibold text-white">
                    {r.score} / {r.totalMarks}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-[#3B82F6]">{r.percentage}%</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.passed
                          ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                          : 'bg-[#EF4444]/20 text-[#F87171] border border-[#EF4444]/30'
                      }`}
                    >
                      {r.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`font-semibold ${
                        r.violationCount > 0 ? 'text-[#F87171] font-bold' : 'text-[#A0A0A0]'
                      }`}
                    >
                      {r.violationCount} Violations ({r.suspicionScore}/100)
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[11px] text-[#808080] font-mono">
                    {r.submissionType}
                  </td>
                  <td className="px-4 py-3.5 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedResult(r)}
                      className="px-3 py-1.5 rounded-lg bg-[#3B82F6]/20 hover:bg-[#3B82F6]/30 text-[#3B82F6] font-bold text-xs transition inline-flex items-center gap-1 border border-[#3B82F6]/30"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Audit Submission</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Audit Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-[#1A1D1F] text-[#E0E0E0] shadow-2xl border border-[#2C2F33] overflow-hidden my-8 animate-in fade-in">
            <div className="bg-[#14171A] px-6 py-4 text-white border-b border-[#2C2F33] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Submission Audit: {selectedResult.studentName}
                </h3>
                <p className="text-xs text-[#A0A0A0]">
                  {selectedResult.examTitle} • ID: {selectedResult.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="text-[#A0A0A0] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-[#14171A] border border-[#2C2F33]">
                  <div className="text-lg font-bold text-white">{selectedResult.score} / {selectedResult.totalMarks}</div>
                  <div className="text-[10px] text-[#A0A0A0]">Score ({selectedResult.percentage}%)</div>
                </div>
                <div className="p-3 rounded-xl bg-[#14171A] border border-[#2C2F33]">
                  <div className="text-lg font-bold text-[#10B981]">{selectedResult.correctAnswersCount}</div>
                  <div className="text-[10px] text-[#A0A0A0]">Correct Answers</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F59E0B]/20 border border-[#F59E0B]/30">
                  <div className="text-lg font-bold text-[#F59E0B]">{selectedResult.suspicionScore}/100</div>
                  <div className="text-[10px] text-[#F59E0B]">Suspicion Index</div>
                </div>
              </div>

              {/* Question Level Responses */}
              {selectedResult.questionResults && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-[#3B82F6] uppercase tracking-wider text-[11px]">
                    Evaluated Question Items
                  </h4>
                  {selectedResult.questionResults.map((qr, i) => (
                    <div key={i} className="p-3 rounded-xl border border-[#2C2F33] bg-[#14171A] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          Q{i + 1}. {qr.questionTitle}
                        </span>
                        <span className={qr.isCorrect ? 'text-[#10B981] font-bold' : 'text-[#F87171] font-bold'}>
                          {qr.marksObtained}/{qr.maxMarks} Marks
                        </span>
                      </div>
                      {qr.type === 'MCQ' ? (
                        <div className="text-[#A0A0A0]">
                          Selected: <strong className="text-white">{qr.selectedOptionId}</strong> | Correct: <strong className="text-[#10B981]">{qr.correctOptionId}</strong>
                        </div>
                      ) : (
                        <div className="font-mono text-[10px] bg-[#0F1113] border border-[#2C2F33] text-emerald-400 p-2 rounded max-h-28 overflow-y-auto">
                          <pre>{qr.codeSubmission?.code || '// No code'}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#14171A] px-6 py-3 border-t border-[#2C2F33] flex justify-end">
              <button
                onClick={() => setSelectedResult(null)}
                className="px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-xs font-bold hover:bg-[#2563EB] transition"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
