import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Clock,
  User,
  Smartphone,
  Camera,
  Layers,
  Filter,
  FastForward,
  Flag,
  Image as ImageIcon,
  ZoomIn,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { ExamRecording, MalpracticeEvent, SeverityLevel } from '../../types/index.ts';

interface ExamRecordingViewerModalProps {
  sessionId: string;
  studentName?: string;
  examTitle?: string;
  onClose: () => void;
}

export const ExamRecordingViewerModal: React.FC<ExamRecordingViewerModalProps> = ({
  sessionId,
  studentName,
  examTitle,
  onClose,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<ExamRecording | null>(null);
  const [events, setEvents] = useState<MalpracticeEvent[]>([]);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  // Player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [flaggedForAudit, setFlaggedForAudit] = useState<boolean>(false);
  const [videoPlayError, setVideoPlayError] = useState<boolean>(false);

  // Selected Snapshot Lightbox Modal
  const [selectedSnapshot, setSelectedSnapshot] = useState<{
    imageUrl: string;
    title: string;
    description: string;
    timestamp: string;
    severity: string;
  } | null>(null);

  useEffect(() => {
    async function loadRecording() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getSessionRecording(sessionId);
        setRecording(data.recording);
        setEvents(data.events || []);
        setStreamUrl(data.streamUrl);
      } catch (err: any) {
        console.error('Failed to load session recording:', err);
        setError(
          err?.message ||
            'Video recording is unavailable or was not recorded for this candidate.'
        );
      } finally {
        setLoading(false);
      }
    }
    loadRecording();
  }, [sessionId]);

  // Video Time Update & Duration Listeners
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const vidDur = videoRef.current.duration;
      if (vidDur && !isNaN(vidDur) && isFinite(vidDur)) {
        setDuration(vidDur);
      } else if (recording?.durationSeconds) {
        setDuration(recording.durationSeconds);
      }
    }
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) {
      setIsPlaying(!isPlaying);
      return;
    }
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setVideoPlayError(false);
        })
        .catch((err) => {
          console.warn('HTML5 video play failed:', err);
          setVideoPlayError(true);
          setIsPlaying(false);
        });
    }
  };

  const handleSeek = (timeSec: number) => {
    setCurrentTime(timeSec);
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = timeSec;
      } catch (e) {}
    }
  };

  const handleChangePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleToggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        videoRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  // Convert ISO event timestamp to relative offset in seconds from recording start
  const getEventOffsetSeconds = (eventTimestamp: string): number => {
    if (!recording?.startedAt) return 0;
    const startMs = new Date(recording.startedAt).getTime();
    const eventMs = new Date(eventTimestamp).getTime();
    return Math.max(0, Math.floor((eventMs - startMs) / 1000));
  };

  // Jump to Next Security Incident
  const handleJumpToNextIncident = () => {
    const upcomingEvents = events
      .map((e) => ({ ...e, offset: getEventOffsetSeconds(e.timestamp) }))
      .filter((e) => e.offset > currentTime + 1)
      .sort((a, b) => a.offset - b.offset);

    if (upcomingEvents.length > 0) {
      handleSeek(upcomingEvents[0].offset);
    } else if (events.length > 0) {
      handleSeek(getEventOffsetSeconds(events[0].timestamp));
    }
  };

  // Download Recording
  const handleDownload = async () => {
    if (!recording) return;
    setIsDownloading(true);
    try {
      const token = localStorage.getItem('auth_token') || '';
      const response = await fetch(`/api/recordings/${recording.id}/download`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ExamRecording_${recording.studentName || 'Student'}_${recording.id}.webm`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Could not download recording: ${err?.message || 'Server error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Severity color maps
  const getSeverityBadgeClass = (severity: SeverityLevel) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'HIGH':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'LOW':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  const getEventIcon = (type: string) => {
    if (type.includes('PHONE') || type.includes('MOBILE')) return <Smartphone className="h-3.5 w-3.5" />;
    if (type.includes('FACE') || type.includes('PERSON')) return <User className="h-3.5 w-3.5" />;
    if (type.includes('CAMERA')) return <Camera className="h-3.5 w-3.5" />;
    if (type.includes('FULLSCREEN') || type.includes('TAB')) return <Layers className="h-3.5 w-3.5" />;
    return <AlertTriangle className="h-3.5 w-3.5" />;
  };

  const filteredEvents = events.filter((e) => {
    if (selectedSeverity === 'ALL') return true;
    return e.severity === selectedSeverity;
  });

  const totalEffectiveDuration = duration || recording?.durationSeconds || 1;

  // Find any snapshot closest to current time
  const currentSnapshot = events.find((evt) => {
    const off = getEventOffsetSeconds(evt.timestamp);
    return Math.abs(off - currentTime) <= 3 && (evt.snapshotUrl || evt.snapshotBase64);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-2xl bg-[#14171A] border border-[#2C2F33] shadow-2xl text-[#E0E0E0] overflow-hidden flex flex-col max-h-[92vh]">
        {/* ======================================================== */}
        {/* HEADER BAR */}
        {/* ======================================================== */}
        <div className="px-6 py-4 border-b border-[#2C2F33] bg-[#1A1D1F] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Proctoring Video Review & Raw Footage
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30">
                  Authentic Camera Stream
                </span>
              </div>
              <p className="text-xs text-[#A0A0A0]">
                Candidate: <strong className="text-white">{recording?.studentName || studentName || 'Student'}</strong> • Exam: <span className="text-[#E0E0E0]">{recording?.examTitle || examTitle || 'Exam'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFlaggedForAudit(!flaggedForAudit)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                flaggedForAudit
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-[#2C2F33] text-[#E0E0E0] border-[#3E4247] hover:bg-[#3E4247]'
              }`}
            >
              <Flag className="h-3.5 w-3.5" />
              <span>{flaggedForAudit ? 'Flagged for Review' : 'Flag Recording'}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading || !recording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2C2F33] hover:bg-[#3E4247] text-xs font-semibold text-white border border-[#3E4247] transition disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-[#3B82F6]" />
              <span>{isDownloading ? 'Exporting...' : 'Download Video'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#2C2F33] hover:bg-[#3E4247] text-[#A0A0A0] hover:text-white transition ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CONTENT BODY (2 COLUMNS: VIDEO PLAYER + TIMELINE) */}
        {/* ======================================================== */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="animate-spin h-10 w-10 border-4 border-[#3B82F6] border-t-transparent rounded-full mb-3"></div>
            <p className="text-sm font-semibold text-white">Loading secure session recording & telemetry...</p>
            <p className="text-xs text-[#A0A0A0] mt-1">Fetching candidate camera feed and evidence frames</p>
          </div>
        ) : error ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">Recording Unavailable</h3>
            <p className="text-xs text-[#A0A0A0] max-w-md mt-1 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#2C2F33] text-xs font-bold text-white hover:bg-[#3E4247]"
            >
              Close Viewer
            </button>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* LEFT 7/12: VIDEO PLAYER + TIMELINE SCRUBBER */}
            <div className="lg:col-span-7 p-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#2C2F33] overflow-y-auto">
              <div className="space-y-4">
                {/* Authentic HTML5 Video Box */}
                <div className="relative aspect-video w-full rounded-xl bg-black border border-[#2C2F33] overflow-hidden shadow-2xl flex items-center justify-center group">
                  {streamUrl ? (
                    <video
                      ref={videoRef}
                      src={streamUrl}
                      onError={() => setVideoPlayError(true)}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={() => setIsPlaying(false)}
                      onClick={handleTogglePlay}
                      className="h-full w-full object-contain cursor-pointer"
                      playsInline
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-6 space-y-2 text-[#A0A0A0]">
                      <Camera className="h-10 w-10 text-gray-500 animate-pulse" />
                      <p className="text-xs font-medium text-white">Webcam Video Stream Synchronizing</p>
                      <p className="text-[11px] text-gray-400">Stream chunks are being aggregated by the proctoring service.</p>
                    </div>
                  )}

                  {/* Play/Pause Center Button Overlay */}
                  {!isPlaying && streamUrl && (
                    <div
                      onClick={handleTogglePlay}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition hover:bg-black/20"
                    >
                      <div className="h-14 w-14 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg hover:scale-105 transition">
                        <Play className="h-7 w-7 ml-1" />
                      </div>
                    </div>
                  )}

                  {/* Candidate Live Stream Watermark */}
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur px-2.5 py-1 rounded text-[10px] font-mono text-[#10B981] flex items-center gap-1.5 border border-white/10 pointer-events-none">
                    <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse"></span>
                    <span>ORIGINAL CAMERA: {recording?.studentName || studentName || 'Candidate'}</span>
                  </div>

                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur px-2.5 py-1 rounded text-[10px] font-mono text-[#A0A0A0] border border-white/10 pointer-events-none">
                    {formatTime(currentTime)} / {formatTime(totalEffectiveDuration)}
                  </div>

                  {/* Active Incident Evidence Overlay Indicator */}
                  {currentSnapshot && (
                    <div className="absolute bottom-3 left-3 right-3 bg-red-950/80 backdrop-blur border border-red-500/50 p-2 rounded-lg flex items-center justify-between text-xs text-red-200 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
                        <span className="font-bold">{currentSnapshot.eventType.replace(/_/g, ' ')}</span>
                      </div>
                      <button
                        onClick={() =>
                          setSelectedSnapshot({
                            imageUrl: (currentSnapshot.snapshotUrl || currentSnapshot.snapshotBase64)!,
                            title: currentSnapshot.eventType.replace(/_/g, ' '),
                            description: currentSnapshot.description || 'Suspicious proctoring signal detected.',
                            timestamp: currentSnapshot.timestamp,
                            severity: currentSnapshot.severity,
                          })
                        }
                        className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] flex items-center gap-1 transition"
                      >
                        <ZoomIn className="h-3 w-3" />
                        <span>Inspect Evidence Frame</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Interactive Timeline Track with Incident Markers */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#A0A0A0]">
                    <span className="font-mono text-white font-semibold">{formatTime(currentTime)}</span>
                    <span className="text-[10px] text-[#3B82F6] font-semibold">
                      {events.length} Proctored Incidents Synchronized
                    </span>
                    <span className="font-mono text-[#A0A0A0]">{formatTime(totalEffectiveDuration)}</span>
                  </div>

                  <div className="relative w-full h-6 flex items-center">
                    {/* Background Progress Slider */}
                    <input
                      type="range"
                      min={0}
                      max={totalEffectiveDuration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={(e) => handleSeek(parseFloat(e.target.value))}
                      className="w-full h-2 rounded-lg bg-[#2C2F33] accent-[#3B82F6] cursor-pointer z-10 opacity-90 hover:opacity-100 transition"
                    />

                    {/* Incident Pin Markers on the Timeline Bar */}
                    <div className="absolute inset-x-0 h-2 pointer-events-none">
                      {events.map((evt) => {
                        const offset = getEventOffsetSeconds(evt.timestamp);
                        const percent = Math.min(100, Math.max(0, (offset / totalEffectiveDuration) * 100));
                        const isCritical = evt.severity === 'CRITICAL' || evt.severity === 'HIGH';
                        return (
                          <div
                            key={evt.id}
                            style={{ left: `${percent}%` }}
                            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border border-black cursor-pointer pointer-events-auto transition hover:scale-150 ${
                              isCritical ? 'bg-red-500 ring-2 ring-red-400/50' : 'bg-amber-400'
                            }`}
                            title={`[${formatTime(offset)}] ${evt.eventType}: ${evt.description || ''}`}
                            onClick={() => handleSeek(offset)}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Video Controls Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#1A1D1F] border border-[#2C2F33]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTogglePlay}
                      className="p-2 rounded-lg bg-[#3B82F6] hover:bg-blue-600 text-white transition"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </button>

                    <button
                      onClick={() => handleSeek(0)}
                      className="p-2 rounded-lg bg-[#2C2F33] hover:bg-[#3E4247] text-[#E0E0E0] transition"
                      title="Restart Video"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>

                    <button
                      onClick={handleJumpToNextIncident}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold hover:bg-red-500/30 transition"
                      title="Jump to Next Malpractice Incident"
                    >
                      <FastForward className="h-3.5 w-3.5" />
                      <span>Next Incident</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Playback Speed selector */}
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-[#A0A0A0]">Speed:</span>
                      {[0.5, 1, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handleChangePlaybackRate(rate)}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition ${
                            playbackRate === rate
                              ? 'bg-[#3B82F6] text-white'
                              : 'bg-[#2C2F33] text-[#A0A0A0] hover:text-white'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleToggleMute}
                      className="p-2 rounded-lg bg-[#2C2F33] hover:bg-[#3E4247] text-[#E0E0E0] transition"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
                    </button>

                    <button
                      onClick={handleToggleFullscreen}
                      className="p-2 rounded-lg bg-[#2C2F33] hover:bg-[#3E4247] text-[#E0E0E0] transition"
                      title="Toggle Fullscreen"
                    >
                      <Maximize className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Recording Metadata Badges */}
              <div className="mt-4 pt-3 border-t border-[#2C2F33] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-[#1A1D1F] border border-[#2C2F33]">
                  <div className="text-[10px] text-[#A0A0A0]">Duration</div>
                  <div className="font-bold text-white font-mono">{formatTime(recording?.durationSeconds || 0)}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#1A1D1F] border border-[#2C2F33]">
                  <div className="text-[10px] text-[#A0A0A0]">Chunks Uploaded</div>
                  <div className="font-bold text-white font-mono">{recording?.uploadedChunks || 0} / {recording?.totalChunks || 0}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#1A1D1F] border border-[#2C2F33]">
                  <div className="text-[10px] text-[#A0A0A0]">File Size</div>
                  <div className="font-bold text-white font-mono">
                    {recording?.fileSize ? `${(recording.fileSize / 1024 / 1024).toFixed(2)} MB` : '0 MB'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#1A1D1F] border border-[#2C2F33]">
                  <div className="text-[10px] text-[#A0A0A0]">Codec & Format</div>
                  <div className="font-bold text-[#10B981] font-mono text-[11px] truncate">
                    {recording?.mimeType || 'video/webm'}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT 5/12: INCIDENT TIMELINE & PROCTORING EVIDENCE */}
            <div className="lg:col-span-5 p-5 flex flex-col justify-between bg-[#14171A] overflow-hidden">
              <div className="flex flex-col h-full overflow-hidden">
                {/* Header & Filter */}
                <div className="flex items-center justify-between pb-3 border-b border-[#2C2F33] shrink-0">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Malpractice Incident Evidence ({filteredEvents.length})
                    </h3>
                  </div>

                  {/* Filter by severity */}
                  <div className="flex items-center gap-1">
                    <Filter className="h-3 w-3 text-[#A0A0A0]" />
                    <select
                      value={selectedSeverity}
                      onChange={(e) => setSelectedSeverity(e.target.value)}
                      className="bg-[#1A1D1F] border border-[#2C2F33] text-[11px] rounded-lg px-2 py-1 text-white focus:outline-none focus:border-[#3B82F6]"
                    >
                      <option value="ALL">All Severities</option>
                      <option value="CRITICAL">Critical Only</option>
                      <option value="HIGH">High Only</option>
                      <option value="MEDIUM">Medium Only</option>
                      <option value="LOW">Low Only</option>
                    </select>
                  </div>
                </div>

                {/* Scrollable Events List */}
                <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
                  {filteredEvents.length === 0 ? (
                    <div className="p-8 text-center text-[#A0A0A0] space-y-2">
                      <ShieldCheck className="h-8 w-8 text-[#10B981] mx-auto" />
                      <p className="text-xs font-semibold text-white">No Malpractice Incidents Found</p>
                      <p className="text-[11px] text-[#A0A0A0]">This session exhibited clean integrity telemetry with no registered violations.</p>
                    </div>
                  ) : (
                    filteredEvents.map((evt) => {
                      const offsetSec = getEventOffsetSeconds(evt.timestamp);
                      const isCurrent = Math.abs(currentTime - offsetSec) < 3;
                      const hasSnapshot = !!(evt.snapshotUrl || evt.snapshotBase64);

                      return (
                        <div
                          key={evt.id}
                          onClick={() => handleSeek(offsetSec)}
                          className={`p-3 rounded-xl border transition cursor-pointer text-xs ${
                            isCurrent
                              ? 'bg-red-500/15 border-red-500/60 shadow-md ring-1 ring-red-500/30'
                              : 'bg-[#1A1D1F] border-[#2C2F33] hover:border-[#3E4247] hover:bg-[#202428]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-white">
                              {getEventIcon(evt.eventType)}
                              <span>{evt.eventType.replace(/_/g, ' ')}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getSeverityBadgeClass(
                                evt.severity
                              )}`}
                            >
                              {evt.severity}
                            </span>
                          </div>

                          <p className="text-[11px] text-[#A0A0A0] mb-2 leading-relaxed">
                            {evt.description || 'Automated rule violation detected by proctoring engine.'}
                          </p>

                          {/* Authentic Camera Snapshot Evidence Thumbnail */}
                          {hasSnapshot && (
                            <div className="mb-2 relative rounded-lg overflow-hidden border border-[#2C2F33] bg-black">
                              <img
                                src={evt.snapshotUrl || evt.snapshotBase64}
                                alt="Authentic camera snapshot"
                                className="w-full h-28 object-cover hover:scale-105 transition duration-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSnapshot({
                                    imageUrl: (evt.snapshotUrl || evt.snapshotBase64)!,
                                    title: evt.eventType.replace(/_/g, ' '),
                                    description: evt.description || 'Proctoring alert snapshot.',
                                    timestamp: evt.timestamp,
                                    severity: evt.severity,
                                  });
                                }}
                              />
                              <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-medium text-emerald-400 flex items-center gap-1 border border-white/10">
                                <CheckCircle className="h-2.5 w-2.5" />
                                <span>Original Webcam Capture</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-[#A0A0A0] pt-1.5 border-t border-[#2C2F33]">
                            <div className="flex items-center gap-1 text-[#3B82F6] font-mono font-bold">
                              <Clock className="h-3 w-3 inline" />
                              <span>{formatTime(offsetSec)}</span>
                              <span className="text-[#A0A0A0] font-normal">into exam</span>
                            </div>
                            {evt.questionId && (
                              <div className="text-[10px] text-[#A0A0A0]">
                                Q: <span className="font-mono text-white">{evt.questionId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Forensic Integrity Summary Card */}
                <div className="mt-2 p-3 rounded-xl bg-[#1A1D1F] border border-[#2C2F33] shrink-0 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[#A0A0A0]">
                    <span>Total Proctored Events:</span>
                    <strong className="text-white font-mono">{events.length}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[#A0A0A0]">
                    <span>Critical Violations:</span>
                    <strong className="text-red-400 font-mono">
                      {events.filter((e) => e.severity === 'CRITICAL' || e.severity === 'HIGH').length}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[#A0A0A0]">
                    <span>Integrity Recommendation:</span>
                    <span
                      className={`font-bold ${
                        events.filter((e) => e.severity === 'CRITICAL').length > 0
                          ? 'text-red-400'
                          : events.length > 0
                          ? 'text-amber-400'
                          : 'text-[#10B981]'
                      }`}
                    >
                      {events.filter((e) => e.severity === 'CRITICAL').length > 0
                        ? 'FLAG FOR MANUAL AUDIT'
                        : events.length > 0
                        ? 'REQUIRES SUPERVISOR REVIEW'
                        : 'CLEAN INTEGRITY VERIFIED'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* EXPANDED EVIDENCE PHOTO INSPECTOR LIGHTBOX */}
        {/* ======================================================== */}
        {selectedSnapshot && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
            <div className="relative max-w-3xl w-full bg-[#1A1D1F] border border-[#2C2F33] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
              <div className="p-4 border-b border-[#2C2F33] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">{selectedSnapshot.title}</h4>
                    <p className="text-xs text-[#A0A0A0]">Original Candidate Webcam Evidence Frame</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSnapshot(null)}
                  className="p-1.5 rounded-lg bg-[#2C2F33] hover:bg-[#3E4247] text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 flex items-center justify-center bg-black">
                <img
                  src={selectedSnapshot.imageUrl}
                  alt="High-resolution camera evidence"
                  className="max-h-[60vh] w-auto rounded-lg object-contain border border-[#2C2F33]"
                />
              </div>

              <div className="p-4 bg-[#14171A] border-t border-[#2C2F33] flex items-center justify-between text-xs">
                <div>
                  <p className="text-white font-medium">{selectedSnapshot.description}</p>
                  <p className="text-[11px] text-[#A0A0A0] mt-0.5">
                    Recorded on: {new Date(selectedSnapshot.timestamp).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded text-xs font-bold border ${getSeverityBadgeClass(
                    selectedSnapshot.severity as SeverityLevel
                  )}`}
                >
                  {selectedSnapshot.severity}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
