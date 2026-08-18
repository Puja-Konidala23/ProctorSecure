import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Trash2,
  Clock,
  HardDrive,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Save,
  Lock,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { RecordingRetentionConfig } from '../../types/index.ts';

interface RecordingRetentionModalProps {
  onClose: () => void;
}

export const RecordingRetentionModal: React.FC<RecordingRetentionModalProps> = ({ onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [cleaning, setCleaning] = useState<boolean>(false);
  const [config, setConfig] = useState<RecordingRetentionConfig>({
    retentionDays: 60,
    autoDeleteExpired: true,
    requireTeacherAuthForPlayback: true,
    allowedRoles: ['TEACHER', 'ADMIN'],
    storageDriver: 'LOCAL_DISK',
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const data = await api.getRecordingRetentionPolicy();
        if (data.config) {
          setConfig(data.config);
        }
      } catch (err) {
        console.warn('Failed to load retention config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.updateRecordingRetentionPolicy(config);
      setMessage('Retention policy successfully updated.');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(`Update failed: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCleanupNow = async () => {
    if (!confirm('Run storage cleanup now? All recordings older than the retention threshold will be permanently pruned.')) {
      return;
    }
    setCleaning(true);
    try {
      const res = await api.cleanupExpiredRecordings();
      alert(`Cleanup completed: ${res.deletedCount || 0} expired recordings removed from storage.`);
    } catch (err: any) {
      alert(`Cleanup error: ${err?.message}`);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#1A1D1F] border border-[#2C2F33] shadow-2xl text-[#E0E0E0] overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2C2F33] bg-[#14171A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Exam Video Retention & Storage Policy
              </h3>
              <p className="text-xs text-[#A0A0A0]">
                Configure retention window, auto-pruning, and access controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#A0A0A0] hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-[#3B82F6] mx-auto mb-2" />
            <p className="text-xs text-[#A0A0A0]">Loading policy parameters...</p>
          </div>
        ) : (
          <div className="p-6 space-y-5 text-xs">
            {message && (
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {/* Retention window days */}
            <div className="space-y-1.5">
              <label className="font-bold text-white flex items-center justify-between">
                <span>Video Retention Duration (Days)</span>
                <span className="text-[#3B82F6] font-mono">{config.retentionDays} Days</span>
              </label>
              <input
                type="range"
                min="7"
                max="365"
                step="7"
                value={config.retentionDays}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, retentionDays: parseInt(e.target.value, 10) }))
                }
                className="w-full h-2 rounded-lg bg-[#14171A] accent-[#3B82F6] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#A0A0A0]">
                <span>1 Week (7d)</span>
                <span>1 Month (30d)</span>
                <span>2 Months (60d)</span>
                <span>1 Year (365d)</span>
              </div>
            </div>

            {/* Auto Delete Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#14171A] border border-[#2C2F33]">
              <div className="space-y-0.5">
                <div className="font-bold text-white">Auto-Prune Expired Archives</div>
                <div className="text-[11px] text-[#A0A0A0]">
                  Permanently delete recordings once the retention period has lapsed
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.autoDeleteExpired}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, autoDeleteExpired: e.target.checked }))
                }
                className="h-4 w-4 rounded border-[#2C2F33] bg-[#14171A] text-[#3B82F6] focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Teacher Auth Required */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#14171A] border border-[#2C2F33]">
              <div className="space-y-0.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Enforce Token Authentication for Video Playback</span>
                </div>
                <div className="text-[11px] text-[#A0A0A0]">
                  Prevent direct URL access; streams require signed JWT authorization headers
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.requireTeacherAuthForPlayback}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    requireTeacherAuthForPlayback: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-[#2C2F33] bg-[#14171A] text-[#3B82F6] focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Driver Type */}
            <div className="p-3.5 rounded-xl bg-[#14171A] border border-[#2C2F33] flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Active Storage Provider</div>
                <div className="text-[11px] text-[#A0A0A0]">Storage subsystem and codec encoder</div>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#2C2F33] text-white font-mono text-[11px]">
                {config.storageDriver} (WebM / VP9)
              </span>
            </div>

            {/* Manual Maintenance Trigger */}
            <div className="pt-2 border-t border-[#2C2F33] flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Manual Storage Maintenance</div>
                <div className="text-[11px] text-[#A0A0A0]">Execute an immediate purge check</div>
              </div>
              <button
                type="button"
                onClick={handleCleanupNow}
                disabled={cleaning}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/30 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{cleaning ? 'Pruning...' : 'Prune Now'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#2C2F33] bg-[#14171A] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#2C2F33] text-white text-xs font-bold hover:bg-[#3E4247] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? 'Saving...' : 'Save Retention Policy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
