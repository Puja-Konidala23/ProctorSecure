import React, { useState } from 'react';
import {
  Shield,
  Lock,
  User,
  GraduationCap,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [role, setRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');
  const [identifier, setIdentifier] = useState<string>('alex.rivera@college.edu');
  const [password, setPassword] = useState<string>('Student#Alex2026!');
  const [adminPin, setAdminPin] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showMatrix, setShowMatrix] = useState<boolean>(false);

  const handleRoleChange = (newRole: 'STUDENT' | 'TEACHER' | 'ADMIN') => {
    setRole(newRole);
    setError(null);
    if (newRole === 'STUDENT') {
      setIdentifier('alex.rivera@college.edu');
      setPassword('Student#Alex2026!');
      setAdminPin('');
    } else if (newRole === 'TEACHER') {
      setIdentifier('dr.sharma@college.edu');
      setPassword('Faculty#Sharma2026!');
      setAdminPin('');
    } else if (newRole === 'ADMIN') {
      setIdentifier('admin.dean@college.edu');
      setPassword('Admin#Dean2026!Sec');
      setAdminPin('948201');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(identifier, password, role, role === 'ADMIN' ? adminPin : undefined);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check credentials and portal role.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1113] flex flex-col justify-center py-10 sm:px-6 lg:px-8 text-[#E0E0E0]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3B82F6] text-white shadow-xl shadow-blue-900/20 font-bold">
          <Shield className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white">
          PROCTOR<span className="text-[#3B82F6]">SECURE</span>
        </h2>
        <p className="text-xs text-[#A0A0A0] font-medium">
          Institutional Examination & Anti-Malpractice System
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#1A1D1F] py-7 px-5 shadow-2xl sm:rounded-3xl sm:px-8 border border-[#2C2F33] space-y-5">
          {/* Role Segment Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0] mb-2 text-center">
              Select Institutional Portal
            </label>
            <div className="grid grid-cols-3 gap-2 bg-[#14171A] p-1.5 rounded-2xl border border-[#2C2F33]">
              <button
                type="button"
                onClick={() => handleRoleChange('STUDENT')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                  role === 'STUDENT'
                    ? 'bg-[#3B82F6] text-white shadow-md'
                    : 'text-[#A0A0A0] hover:text-white hover:bg-[#1A1D1F]'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('TEACHER')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                  role === 'TEACHER'
                    ? 'bg-[#F59E0B] text-black shadow-md'
                    : 'text-[#A0A0A0] hover:text-white hover:bg-[#1A1D1F]'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Faculty</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('ADMIN')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                  role === 'ADMIN'
                    ? 'bg-[#EF4444] text-white shadow-md'
                    : 'text-[#A0A0A0] hover:text-white hover:bg-[#1A1D1F]'
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Portal Notice Banner */}
          {role === 'ADMIN' && (
            <div className="rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 p-3 text-[11px] text-[#FCA5A5] flex items-start gap-2.5">
              <KeyRound className="h-4 w-4 shrink-0 text-[#EF4444] mt-0.5" />
              <div>
                <span className="font-bold block text-white">Level-3 Controller Clearance</span>
                Administrative access requires high-entropy credentials & Master 2FA PIN. Students & unauthorized personnel are strictly blocked.
              </div>
            </div>
          )}

          {role === 'STUDENT' && (
            <div className="rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 p-2.5 text-[11px] text-[#93C5FD] flex items-center gap-2">
              <GraduationCap className="h-4 w-4 shrink-0 text-[#3B82F6]" />
              <span>Enter your official Student Roll Number (e.g. CS2026-0842) or institutional student email.</span>
            </div>
          )}

          {role === 'TEACHER' && (
            <div className="rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-2.5 text-[11px] text-[#FDE68A] flex items-center gap-2">
              <User className="h-4 w-4 shrink-0 text-[#F59E0B]" />
              <span>Faculty Examination Control & Evaluation Console.</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 p-3 text-xs text-[#F87171] flex items-start gap-2.5 animate-shake">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#EF4444] mt-0.5" />
              <div className="font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#A0A0A0] mb-1">
                {role === 'STUDENT' ? 'Student ID or College Email' : 'Institutional Email'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    role === 'STUDENT'
                      ? 'e.g. CS2026-0842 or alex.rivera@college.edu'
                      : role === 'TEACHER'
                      ? 'e.g. dr.sharma@college.edu'
                      : 'e.g. admin.dean@college.edu'
                  }
                  className="w-full p-2.5 pl-3 rounded-xl border border-[#2C2F33] bg-[#14171A] text-[#E0E0E0] placeholder-[#606060] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#A0A0A0] mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter strong institutional password"
                  className="w-full p-2.5 pl-3 rounded-xl border border-[#2C2F33] bg-[#14171A] text-[#E0E0E0] placeholder-[#606060] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>

            {/* Admin 2FA PIN */}
            {role === 'ADMIN' && (
              <div>
                <label className="block font-bold text-[#EF4444] mb-1 flex items-center justify-between">
                  <span>6-Digit Master Security Verification PIN</span>
                  <span className="text-[10px] text-[#A0A0A0] font-normal font-mono">Controller 2FA</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="e.g. 948201"
                  className="w-full p-2.5 pl-3 rounded-xl border border-[#EF4444]/40 bg-[#14171A] text-white font-mono tracking-widest placeholder-[#606060] focus:outline-none focus:border-[#EF4444]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-xl text-white font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                role === 'ADMIN'
                  ? 'bg-[#EF4444] hover:bg-[#DC2626] shadow-red-900/20'
                  : role === 'TEACHER'
                  ? 'bg-[#F59E0B] hover:bg-[#D97706] text-black shadow-amber-900/20'
                  : 'bg-[#3B82F6] hover:bg-[#2563EB] shadow-blue-900/20'
              }`}
            >
              {loading ? (
                <span>Verifying Security Clearance...</span>
              ) : (
                <>
                  <span>
                    {role === 'ADMIN'
                      ? 'Authenticate Admin Clearance'
                      : role === 'TEACHER'
                      ? 'Sign In to Faculty Portal'
                      : 'Sign In as Student'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Collapsible Institutional Credential Reference */}
          <div className="pt-2 border-t border-[#2C2F33]">
            <button
              type="button"
              onClick={() => setShowMatrix(!showMatrix)}
              className="w-full text-[11px] text-[#808080] hover:text-[#E0E0E0] flex items-center justify-between py-1 transition"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Info className="h-3.5 w-3.5 text-[#3B82F6]" />
                Institutional Testing Credentials & Access Matrix
              </span>
              {showMatrix ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showMatrix && (
              <div className="mt-2.5 space-y-2 text-[11px] bg-[#14171A] p-3 rounded-xl border border-[#2C2F33] animate-in fade-in duration-150">
                <div className="p-2 rounded-lg bg-[#1A1D1F] border border-[#3B82F6]/20">
                  <span className="font-bold text-[#3B82F6] block">🎓 Student Account (Alex Rivera)</span>
                  <div className="text-[#A0A0A0] mt-0.5 space-y-0.5 font-mono text-[10px]">
                    <div>Email: alex.rivera@college.edu</div>
                    <div>Roll ID: CS2026-0842</div>
                    <div>Password: Student#Alex2026!</div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#1A1D1F] border border-[#F59E0B]/20">
                  <span className="font-bold text-[#F59E0B] block">👨‍🏫 Faculty Account (Dr. Ramesh Sharma)</span>
                  <div className="text-[#A0A0A0] mt-0.5 space-y-0.5 font-mono text-[10px]">
                    <div>Email: dr.sharma@college.edu</div>
                    <div>Password: Faculty#Sharma2026!</div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#1A1D1F] border border-[#EF4444]/20">
                  <span className="font-bold text-[#EF4444] block">🛡️ Controller of Exams (Dean Vance)</span>
                  <div className="text-[#A0A0A0] mt-0.5 space-y-0.5 font-mono text-[10px]">
                    <div>Email: admin.dean@college.edu</div>
                    <div>Password: Admin#Dean2026!Sec</div>
                    <div>Master 2FA PIN: 948201</div>
                  </div>
                </div>

                <div className="text-[10px] text-[#808080] italic pt-1">
                  * Note: Student credentials cannot log into Faculty or Admin portals. Role barrier is cryptographically enforced.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
