import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldAlert,
  Camera,
  Maximize2,
  AlertTriangle,
  Send,
  Ban,
  User,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { LiveCandidateStatus, MalpracticeEvent } from '../../types/index.ts';

export const LiveMonitoringView: React.FC = () => {
  const [candidates, setCandidates] = useState<LiveCandidateStatus[]>([]);
  const [timeline, setTimeline] = useState<MalpracticeEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [warningMessageInput, setWarningMessageInput] = useState<string>('Please keep your camera centered and do not switch windows.');
  const [selectedCandidate, setSelectedCandidate] = useState<LiveCandidateStatus | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchLiveStatus = async () => {
    try {
      const res = await api.getLiveProctoringStatus();
      setCandidates(res.candidates || []);
      setTimeline(res.recentMalpracticeEvents || []);
    } catch (err) {
      console.warn('Failed to load live proctoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSendWarning = async (candidate: LiveCandidateStatus) => {
    try {
      await api.sendTeacherWarning(
        candidate.sessionId,
        warningMessageInput || 'Official Proctor Warning: Return focus to your exam immediately.'
      );
      setActionSuccess(`Warning dispatched to ${candidate.studentName}.`);
      setSelectedCandidate(null);
      fetchLiveStatus();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`Failed to send warning: ${err?.message}`);
    }
  };

  const handleTerminateSession = async (candidate: LiveCandidateStatus) => {
    if (
      !confirm(
        `Are you sure you want to forcibly terminate the exam session for ${candidate.studentName}? This action is irreversible.`
      )
    ) {
      return;
    }

    try {
      await api.terminateSession(
        candidate.sessionId,
        'Examination terminated by proctor due to observed irregularities.'
      );
      setActionSuccess(`Session terminated for ${candidate.studentName}.`);
      fetchLiveStatus();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(`Termination failed: ${err?.message}`);
    }
  };

  const filteredCandidates = candidates.filter(
    (c) =>
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.examTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-[#E0E0E0]">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2C2F33] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]"></span>
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Live Proctoring & Malpractice Command Center
            </h1>
          </div>
          <p className="text-xs text-[#A0A0A0] mt-1">
            Real-time candidate telemetry, biometric stream integrity, and instant warning intervention
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLiveStatus}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#2C2F33] bg-[#1A1D1F] hover:bg-[#2C2F33] text-xs font-bold text-[#E0E0E0] hover:text-white transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="rounded-2xl bg-[#10B981]/20 border border-[#10B981]/40 p-4 text-xs font-bold text-[#10B981] flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Grid: 2 Columns - Left: Candidates Grid (2 cols on xl), Right: Real-time Malpractice Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Candidates Grid */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">
                Active Candidates ({candidates.length})
              </h2>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-[#A0A0A0]" />
              <input
                type="text"
                placeholder="Search candidate or roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#2C2F33] bg-[#1A1D1F] text-xs text-white placeholder-[#808080] focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-[#A0A0A0] bg-[#1A1D1F] rounded-2xl border border-[#2C2F33]">
              Initializing telemetry stream...
            </div>
          ) : filteredCandidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCandidates.map((candidate) => {
                const isHighRisk = candidate.suspicionScore >= 50 || candidate.violationCount >= 2;
                return (
                  <div
                    key={candidate.sessionId}
                    className={`rounded-2xl border bg-[#1A1D1F] p-5 space-y-4 shadow-lg transition ${
                      isHighRisk
                        ? 'border-[#EF4444]/60 ring-1 ring-[#EF4444]/40'
                        : 'border-[#2C2F33] hover:border-[#40444B]'
                    }`}
                  >
                    {/* Candidate Info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#14171A] border border-[#2C2F33] text-white font-bold text-sm">
                          {candidate.studentName[0]}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{candidate.studentName}</div>
                          <div className="text-[11px] text-[#A0A0A0] font-mono">
                            {candidate.studentId}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          candidate.status === 'TERMINATED'
                            ? 'bg-[#EF4444]/20 text-[#F87171] border border-[#EF4444]/40'
                            : candidate.suspicionScore > 50
                            ? 'bg-[#EF4444]/20 text-[#F87171] border border-[#EF4444]/40 animate-pulse'
                            : candidate.suspicionScore > 20
                            ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                            : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                        }`}
                      >
                        {candidate.status === 'TERMINATED'
                          ? 'TERMINATED'
                          : candidate.suspicionScore > 50
                          ? 'HIGH RISK'
                          : candidate.suspicionScore > 20
                          ? 'MODERATE'
                          : 'NORMAL'}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-[#E0E0E0] truncate">
                      {candidate.examTitle}
                    </div>

                    {/* Telemetry Metrics Bar */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#14171A] p-2.5 rounded-xl border border-[#2C2F33]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#A0A0A0]">Camera</span>
                        <span
                          className={`font-bold ${
                            candidate.cameraActive ? 'text-[#10B981]' : 'text-[#F87171]'
                          }`}
                        >
                          {candidate.cameraActive ? 'Active' : 'Offline'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#A0A0A0]">Fullscreen</span>
                        <span
                          className={`font-bold ${
                            candidate.fullscreenActive ? 'text-[#10B981]' : 'text-[#F59E0B]'
                          }`}
                        >
                          {candidate.fullscreenActive ? 'Enforced' : 'Exited'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#A0A0A0]">Violations</span>
                        <span
                          className={`font-bold ${
                            candidate.violationCount > 0 ? 'text-[#F87171]' : 'text-[#E0E0E0]'
                          }`}
                        >
                          {candidate.violationCount} recorded
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#A0A0A0]">Suspicion Index</span>
                        <span
                          className={`font-bold ${
                            candidate.suspicionScore > 50
                              ? 'text-[#F87171]'
                              : candidate.suspicionScore > 20
                              ? 'text-[#F59E0B]'
                              : 'text-[#10B981]'
                          }`}
                        >
                          {candidate.suspicionScore}/100
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Actions */}
                    <div className="space-y-3 pt-1 border-t border-[#2C2F33]">
                      <div className="flex items-center justify-between text-[11px] text-[#A0A0A0]">
                        <span>Answer Progress</span>
                        <span className="font-bold text-white">
                          {candidate.answeredCount}/{candidate.totalQuestions} ({candidate.progressPercentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[#14171A] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#3B82F6] rounded-full"
                          style={{ width: `${candidate.progressPercentage}%` }}
                        ></div>
                      </div>

                      {/* Proctor Control Actions */}
                      {candidate.status !== 'TERMINATED' && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => setSelectedCandidate(candidate)}
                            className="flex-1 py-1.5 rounded-lg bg-[#3B82F6]/20 hover:bg-[#3B82F6]/30 text-[#3B82F6] text-xs font-bold transition flex items-center justify-center gap-1.5 border border-[#3B82F6]/30"
                          >
                            <Send className="h-3 w-3" />
                            <span>Warn Candidate</span>
                          </button>

                          <button
                            onClick={() => handleTerminateSession(candidate)}
                            className="py-1.5 px-3 rounded-lg bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#F87171] text-xs font-bold transition flex items-center gap-1 border border-[#EF4444]/30"
                            title="Force Terminate"
                          >
                            <Ban className="h-3 w-3" />
                            <span>Terminate</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-[#1A1D1F] border border-[#2C2F33] text-xs text-[#A0A0A0]">
              No active candidates found matching query.
            </div>
          )}
        </div>

        {/* Right Column: Real-Time Incident Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#EF4444]" />
              Live Malpractice Stream
            </h2>
            <span className="text-[11px] text-[#A0A0A0] font-mono">Real-Time Ingestion</span>
          </div>

          <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] p-4 space-y-3 shadow-lg max-h-[600px] overflow-y-auto">
            {timeline.length > 0 ? (
              <div className="space-y-3">
                {timeline.map((evt) => {
                  const isHigh = evt.severity === 'HIGH' || evt.severity === 'CRITICAL';
                  return (
                    <div
                      key={evt.id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        isHigh
                          ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#F87171]'
                          : 'bg-[#14171A] border-[#2C2F33] text-[#E0E0E0]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          {evt.eventType.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            isHigh
                              ? 'bg-[#EF4444]/30 text-[#F87171] border border-[#EF4444]/40'
                              : 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                          }`}
                        >
                          {evt.severity}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#A0A0A0] leading-snug">{evt.description}</p>

                      {(evt.snapshotUrl || evt.snapshotBase64) && (
                        <div className="relative rounded-lg overflow-hidden border border-[#2C2F33] bg-black my-1">
                          <img
                            src={evt.snapshotUrl || evt.snapshotBase64}
                            alt="Live candidate snapshot"
                            className="w-full h-24 object-cover"
                          />
                          <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-emerald-400">
                            CAM SNAPSHOT
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-[#808080] pt-1 border-t border-[#2C2F33] font-mono">
                        <span>Session: {evt.sessionId.slice(0, 10)}</span>
                        <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#A0A0A0]">
                No malpractice incidents logged in current session.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warning Dispatch Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#1A1D1F] p-6 shadow-2xl border border-[#2C2F33] space-y-4 animate-in fade-in text-[#E0E0E0]">
            <div className="flex items-center gap-3 border-b border-[#2C2F33] pb-3">
              <div className="p-2 rounded-xl bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Send Warning to {selectedCandidate.studentName}
                </h3>
                <p className="text-[11px] text-[#A0A0A0]">
                  Roll No: {selectedCandidate.studentId} • Violations: {selectedCandidate.violationCount}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-[#A0A0A0]">Official Proctor Message:</label>
              <textarea
                rows={3}
                value={warningMessageInput}
                onChange={(e) => setWarningMessageInput(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#2C2F33] bg-[#14171A] text-xs text-white focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 text-xs font-semibold text-[#A0A0A0] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendWarning(selectedCandidate)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold shadow-md shadow-blue-900/20 transition"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Warning</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
