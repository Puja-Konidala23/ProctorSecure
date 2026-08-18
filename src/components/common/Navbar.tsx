import React, { useState } from 'react';
import {
  Shield,
  User,
  LogOut,
  GraduationCap,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  activeExamMode?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, activeExamMode = false }) => {
  const { user, role, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  if (activeExamMode) {
    // In active exam mode, keep top bar minimal to avoid distraction
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#2C2F33] bg-[#1A1D1F] text-[#E0E0E0] shadow-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6] text-white shadow-md shadow-blue-900/20 font-bold">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-[#E0E0E0]">
                PROCTOR<span className="text-[#3B82F6]">SECURE</span>
              </span>
              <span className="rounded bg-[#2C2F33] px-2 py-0.5 text-[11px] font-semibold text-[#3B82F6] border border-[#3B82F6]/30 uppercase tracking-wider">
                COLLEGE PORTAL
              </span>
            </div>
            <p className="text-xs text-[#A0A0A0] font-medium hidden sm:block">
              AI-Powered Examination & Anti-Malpractice Platform
            </p>
          </div>
        </div>

        {/* Navigation Tabs based on Role */}
        <nav className="hidden md:flex items-center gap-1.5">
          {role === 'STUDENT' && (
            <>
              <button
                onClick={() => onNavigate('student_dashboard')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  currentView === 'student_dashboard'
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-[#A0A0A0] hover:bg-[#2C2F33] hover:text-[#E0E0E0]'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Examinations
              </button>
            </>
          )}

          {role === 'TEACHER' && (
            <>
              <button
                onClick={() => onNavigate('teacher_dashboard')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  currentView === 'teacher_dashboard'
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-[#A0A0A0] hover:bg-[#2C2F33] hover:text-[#E0E0E0]'
                }`}
              >
                <Layers className="h-4 w-4" />
                Exams & Bank
              </button>
              <button
                onClick={() => onNavigate('teacher_live')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  currentView === 'teacher_live'
                    ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                    : 'text-[#A0A0A0] hover:bg-[#2C2F33] hover:text-[#E0E0E0]'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
                </span>
                <Activity className="h-4 w-4 text-[#A0A0A0]" />
                Live Proctoring
              </button>
              <button
                onClick={() => onNavigate('teacher_analytics')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  currentView === 'teacher_analytics'
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-[#A0A0A0] hover:bg-[#2C2F33] hover:text-[#E0E0E0]'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                Results & Analytics
              </button>
            </>
          )}

          {role === 'ADMIN' && (
            <>
              <button
                onClick={() => onNavigate('admin_dashboard')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  currentView === 'admin_dashboard'
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-[#A0A0A0] hover:bg-[#2C2F33] hover:text-[#E0E0E0]'
                }`}
              >
                <Shield className="h-4 w-4" />
                Admin Console & Audit Logs
              </button>
            </>
          )}
        </nav>

        {/* Authenticated Profile Menu */}
        <div className="flex items-center gap-3">
          {/* Security Clearance Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#2C2F33] bg-[#14171A] text-[11px]">
            <span
              className={`h-2 w-2 rounded-full ${
                role === 'ADMIN'
                  ? 'bg-[#EF4444]'
                  : role === 'TEACHER'
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#10B981]'
              }`}
            />
            <span className="font-semibold text-[#A0A0A0]">
              {role === 'ADMIN'
                ? 'Level-3 Admin'
                : role === 'TEACHER'
                ? 'Faculty Authorized'
                : 'Student Session'}
            </span>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2.5 rounded-lg border border-[#2C2F33] bg-[#14171A] px-3 py-1.5 text-xs font-medium text-[#E0E0E0] hover:border-[#3B82F6] hover:bg-[#1A1D1F] transition"
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs border ${
                  role === 'ADMIN'
                    ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40'
                    : role === 'TEACHER'
                    ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40'
                    : 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/40'
                }`}
              >
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-semibold text-[#E0E0E0] leading-tight truncate max-w-[130px]">
                  {user?.name || 'User'}
                </div>
                <div className="text-[10px] text-[#A0A0A0] font-medium">
                  {user?.role === 'STUDENT'
                    ? `Student (${user.studentId || 'CS'})`
                    : user?.role === 'TEACHER'
                    ? 'Professor / Faculty'
                    : 'Examination Admin'}
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#A0A0A0]" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#2C2F33] bg-[#1A1D1F] p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-[#E0E0E0] space-y-3">
                <div className="border-b border-[#2C2F33] pb-2.5">
                  <p className="text-xs font-bold text-white flex items-center justify-between">
                    <span>{user?.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        role === 'ADMIN'
                          ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30'
                          : role === 'TEACHER'
                          ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                          : 'bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30'
                      }`}
                    >
                      {user?.role}
                    </span>
                  </p>
                  <p className="text-[11px] text-[#A0A0A0] truncate font-mono mt-0.5">{user?.email}</p>
                  {user?.studentId && (
                    <p className="text-[10px] text-[#808080] font-mono mt-0.5">Roll No: {user.studentId}</p>
                  )}
                  {user?.department && (
                    <p className="text-[10px] text-[#808080] mt-0.5">{user.department}</p>
                  )}
                </div>

                <div className="text-[11px] text-[#A0A0A0] bg-[#14171A] p-2 rounded-lg border border-[#2C2F33] flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                  <span>Authenticated via Institutional Clearance</span>
                </div>

                <div className="border-t border-[#2C2F33] pt-1">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#F87171] border border-[#EF4444]/20 flex items-center justify-between font-bold transition"
                  >
                    <span className="flex items-center gap-2">
                      <LogOut className="h-3.5 w-3.5" />
                      Secure Sign Out
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
