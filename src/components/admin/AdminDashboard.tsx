import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  UserPlus,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type { AuditLog, User } from '../../types/index.ts';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'USERS'>('AUDIT');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  // New User Form State
  const [newUserModalOpen, setNewUserModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRole, setNewRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');
  const [newStudentId, setNewStudentId] = useState<string>('');
  const [newDept, setNewDept] = useState<string>('Computer Science & Engineering');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, usersRes] = await Promise.all([
        api.getAuditLogs(),
        api.getAdminUsers(),
      ]);
      setAuditLogs(logsRes || []);
      setUsers(usersRes || []);
    } catch (err) {
      console.warn('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    try {
      await api.createAdminUser({
        name: newName,
        email: newEmail,
        role: newRole,
        studentId: newRole === 'STUDENT' ? newStudentId : undefined,
        department: newDept,
      });
      setNewUserModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewStudentId('');
      fetchData();
    } catch (err: any) {
      alert(`User creation failed: ${err?.message}`);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchSeverity = severityFilter === 'ALL' || log.severity === severityFilter;
    return matchSearch && matchSeverity;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 text-[#E0E0E0]">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2C2F33] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Institutional Admin Console
            </h1>
            <span className="rounded-md bg-[#3B82F6]/20 border border-[#3B82F6]/40 px-2 py-0.5 text-xs font-bold text-[#3B82F6]">
              Root Authority
            </span>
          </div>
          <p className="text-xs text-[#A0A0A0] mt-1">
            System audit trail, security telemetry verification, and college user management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setNewUserModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold transition shadow-md shadow-blue-900/20"
          >
            <UserPlus className="h-4 w-4" />
            <span>Provision User</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-[#2C2F33]">
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'AUDIT'
              ? 'border-[#3B82F6] text-[#3B82F6]'
              : 'border-transparent text-[#A0A0A0] hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Security & System Audit Log ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('USERS')}
          className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'USERS'
              ? 'border-[#3B82F6] text-[#3B82F6]'
              : 'border-transparent text-[#A0A0A0] hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>User Directory ({users.length})</span>
        </button>
      </div>

      {/* Tab 1: Audit Log */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1A1D1F] p-4 rounded-2xl border border-[#2C2F33]">
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-[#A0A0A0]" />
              <input
                type="text"
                placeholder="Search audit action, user, or IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#2C2F33] bg-[#14171A] text-xs text-white placeholder-[#808080] focus:outline-hidden focus:border-[#3B82F6]"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#A0A0A0] font-bold">Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-lg border border-[#2C2F33] bg-[#14171A] px-2.5 py-1 text-xs font-semibold text-white focus:outline-hidden focus:border-[#3B82F6]"
              >
                <option value="ALL">All Severities</option>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#E0E0E0]">
                <thead className="bg-[#14171A] text-[11px] uppercase font-bold text-[#A0A0A0] border-b border-[#2C2F33]">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action Event</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Telemetry Details</th>
                    <th className="px-4 py-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2C2F33] font-mono text-[11px]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#14171A]/70 transition">
                      <td className="px-4 py-3 text-[#A0A0A0] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 font-sans font-bold text-white">
                        {log.userName}
                      </td>
                      <td className="px-4 py-3 font-sans font-semibold text-[#E0E0E0]">
                        {log.action}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                            log.severity === 'CRITICAL'
                              ? 'bg-[#EF4444]/20 text-[#F87171] border border-[#EF4444]/40'
                              : log.severity === 'WARNING'
                              ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                              : 'bg-[#2C2F33] text-[#A0A0A0] border border-[#40444B]'
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-sans text-[#A0A0A0] max-w-sm truncate">
                        {log.details}
                      </td>
                      <td className="px-4 py-3 text-[#808080]">{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Users Directory */}
      {activeTab === 'USERS' && (
        <div className="rounded-2xl border border-[#2C2F33] bg-[#1A1D1F] overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#E0E0E0]">
              <thead className="bg-[#14171A] text-[11px] uppercase font-bold text-[#A0A0A0] border-b border-[#2C2F33]">
                <tr>
                  <th className="px-4 py-3">User Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Student Roll / Staff ID</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2C2F33]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#14171A]/70 transition">
                    <td className="px-4 py-3 font-bold text-white">{u.name}</td>
                    <td className="px-4 py-3 text-[#A0A0A0]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : u.role === 'TEACHER'
                            ? 'bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30'
                            : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#A0A0A0]">{u.studentId || '—'}</td>
                    <td className="px-4 py-3 text-[#A0A0A0]">{u.department || '—'}</td>
                    <td className="px-4 py-3 text-[#808080]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provision User Modal */}
      {newUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#1A1D1F] p-6 shadow-2xl border border-[#2C2F33] space-y-4 animate-in fade-in text-[#E0E0E0]">
            <div className="flex items-center justify-between border-b border-[#2C2F33] pb-3">
              <h3 className="text-base font-bold text-white">Provision Institutional User</h3>
              <button onClick={() => setNewUserModalOpen(false)} className="text-[#A0A0A0] hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#A0A0A0] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. David Miller"
                  className="w-full p-2.5 rounded-xl border border-[#2C2F33] bg-[#14171A] text-white focus:outline-hidden focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#A0A0A0] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@college.edu"
                  className="w-full p-2.5 rounded-xl border border-[#2C2F33] bg-[#14171A] text-white focus:outline-hidden focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#A0A0A0] mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#2C2F33] bg-[#14171A] text-white font-bold focus:outline-hidden focus:border-[#3B82F6]"
                >
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher / Faculty</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              {newRole === 'STUDENT' && (
                <div>
                  <label className="block font-bold text-[#A0A0A0] mb-1">Student Roll Number</label>
                  <input
                    type="text"
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    placeholder="e.g. CS2026-0911"
                    className="w-full p-2.5 rounded-xl border border-[#2C2F33] bg-[#14171A] text-white focus:outline-hidden focus:border-[#3B82F6]"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-[#A0A0A0] mb-1">Academic Department</label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#2C2F33] bg-[#14171A] text-white focus:outline-hidden focus:border-[#3B82F6]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setNewUserModalOpen(false)}
                  className="px-4 py-2 text-[#A0A0A0] hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#3B82F6] text-white rounded-xl font-bold hover:bg-[#2563EB] transition shadow-md shadow-blue-900/20"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
