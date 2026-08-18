import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/common/Navbar.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';
import { StudentDashboard } from './components/student/StudentDashboard.tsx';
import { ExamRoom } from './components/exam/ExamRoom.tsx';
import { StudentResultView } from './components/student/StudentResultView.tsx';
import { TeacherDashboard } from './components/teacher/TeacherDashboard.tsx';
import { ExamCreator } from './components/teacher/ExamCreator.tsx';
import { LiveMonitoringView } from './components/teacher/LiveMonitoringView.tsx';
import { TeacherAnalyticsView } from './components/teacher/TeacherAnalyticsView.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';

function MainApp() {
  const { user, role, loading, isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<string>('student_dashboard');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeResultId, setActiveResultId] = useState<string | null>(null);

  // Sync default view when user role changes
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeSessionId) return; // Keep exam session active if currently taking exam

    if (role === 'STUDENT') {
      setCurrentView('student_dashboard');
    } else if (role === 'TEACHER') {
      setCurrentView('teacher_dashboard');
    } else if (role === 'ADMIN') {
      setCurrentView('admin_dashboard');
    }
  }, [role, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-3"></div>
        <p className="text-xs font-bold text-slate-300">Initializing ProctorSecure Platform...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginPage
        onSuccess={() => {
          if (role === 'STUDENT') setCurrentView('student_dashboard');
          else if (role === 'TEACHER') setCurrentView('teacher_dashboard');
          else setCurrentView('admin_dashboard');
        }}
      />
    );
  }

  // Active Exam Room
  if (activeSessionId && currentView === 'exam_active') {
    return (
      <ExamRoom
        sessionId={activeSessionId}
        onExamCompleted={(resultId) => {
          setActiveSessionId(null);
          setActiveResultId(resultId);
          setCurrentView('student_result');
        }}
        onExit={() => {
          setActiveSessionId(null);
          setCurrentView('student_dashboard');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1113] flex flex-col font-sans text-[#E0E0E0] selection:bg-[#3B82F6] selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setActiveResultId(null);
          setCurrentView(view);
        }}
        activeExamMode={false}
      />

      {/* Main Content Body */}
      <main className="flex-1">
        {/* STUDENT VIEWS */}
        {currentView === 'student_dashboard' && (
          <StudentDashboard
            onStartExam={(sessionId) => {
              setActiveSessionId(sessionId);
              setCurrentView('exam_active');
            }}
            onViewResult={(resultId) => {
              setActiveResultId(resultId);
              setCurrentView('student_result');
            }}
          />
        )}

        {currentView === 'student_result' && activeResultId && (
          <StudentResultView
            resultId={activeResultId}
            onBack={() => {
              setActiveResultId(null);
              setCurrentView(role === 'TEACHER' ? 'teacher_analytics' : 'student_dashboard');
            }}
          />
        )}

        {/* TEACHER VIEWS */}
        {currentView === 'teacher_dashboard' && (
          <TeacherDashboard
            onCreateExam={() => setCurrentView('teacher_create_exam')}
            onLiveMonitor={() => setCurrentView('teacher_live')}
            onAnalytics={() => setCurrentView('teacher_analytics')}
          />
        )}

        {currentView === 'teacher_create_exam' && (
          <ExamCreator
            onBack={() => setCurrentView('teacher_dashboard')}
            onExamCreated={() => setCurrentView('teacher_dashboard')}
          />
        )}

        {currentView === 'teacher_live' && <LiveMonitoringView />}

        {currentView === 'teacher_analytics' && <TeacherAnalyticsView />}

        {/* ADMIN VIEWS */}
        {currentView === 'admin_dashboard' && <AdminDashboard />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
