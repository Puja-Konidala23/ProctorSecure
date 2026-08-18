import type {
  User,
  Exam,
  Question,
  ExamSession,
  ExamResult,
  ExamRecording,
  RecordingRetentionConfig,
  MalpracticeEvent,
  AuditLog,
  LiveCandidateStatus,
} from '../types/index.ts';

const TOKEN_KEY = 'exam_portal_token';

class ApiClient {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = { error: `Server error (${response.status})` };
    }

    if (!response.ok) {
      throw new Error(data?.error || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  // Auth APIs
  async login(
    identifier: string,
    password: string,
    role?: string,
    adminPin?: string
  ): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, role, adminPin }),
    });
    this.setToken(res.token);
    return res;
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  // Student APIs
  async getStudentExams(): Promise<{
    available: any[];
    upcoming: any[];
    completed: any[];
    stats: {
      totalExamsCount: number;
      availableCount: number;
      upcomingCount: number;
      completedCount: number;
      averagePercentage: number;
    };
  }> {
    return this.request('/api/student/exams');
  }

  async getExamDetails(examId: string): Promise<any> {
    return this.request(`/api/student/exams/${examId}`);
  }

  async startExam(examId: string): Promise<{ sessionId: string }> {
    return this.request(`/api/exams/${examId}/start`, { method: 'POST' });
  }

  async getExamSession(sessionId: string): Promise<{
    session: any;
    examSettings: any;
    questions: Question[];
    serverTime: string;
    isExpired?: boolean;
    resultId?: string;
  }> {
    return this.request(`/api/exam-sessions/${sessionId}`);
  }

  async sendHeartbeat(
    sessionId: string,
    data: { cameraActive?: boolean; fullscreenActive?: boolean }
  ): Promise<{
    status: string;
    proctorStatus: string;
    violationCount: number;
    suspicionScore: number;
    remainingSeconds: number;
    isTerminated?: boolean;
  }> {
    return this.request(`/api/exam-sessions/${sessionId}/heartbeat`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async saveAnswer(
    sessionId: string,
    payload: {
      questionId: string;
      selectedOptionId?: string;
      textAnswer?: string;
      codeAnswer?: string;
      codeLanguage?: string;
      isFlagged?: boolean;
    }
  ): Promise<{ success: boolean; savedAt: string }> {
    return this.request(`/api/exam-sessions/${sessionId}/answers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async sendSecurityEvent(
    sessionId: string,
    payload: {
      eventType: string;
      description?: string;
      currentQuestionId?: string;
      browserInfo?: string;
      snapshotBase64?: string;
    }
  ): Promise<{
    success: boolean;
    currentViolations: number;
    maxViolations: number;
    suspicionScore: number;
    proctorStatus: string;
    autoSubmitted: boolean;
    resultId?: string;
    warningMessage?: string;
  }> {
    return this.request(`/api/exam-sessions/${sessionId}/security-events`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async submitExam(sessionId: string): Promise<{ success: boolean; resultId: string }> {
    return this.request(`/api/exam-sessions/${sessionId}/submit`, {
      method: 'POST',
    });
  }

  async getExamResult(resultId: string): Promise<ExamResult> {
    return this.request(`/api/exam-results/${resultId}`);
  }

  // Compiler APIs
  async runCode(
    code: string,
    language: string,
    input: string
  ): Promise<{
    status: string;
    stdout: string;
    stderr: string;
    executionTimeMs: number;
    memoryUsageKb?: number;
  }> {
    return this.request('/api/compiler/run', {
      method: 'POST',
      body: JSON.stringify({ code, language, input }),
    });
  }

  async testCode(
    code: string,
    language: string,
    questionId: string
  ): Promise<{
    allPassed: boolean;
    passedTestsCount: number;
    totalTestsCount: number;
    testCaseResults: Array<{
      testCaseIndex: number;
      input: string;
      expectedOutput: string;
      actualOutput: string;
      passed: boolean;
      executionTimeMs: number;
    }>;
  }> {
    return this.request('/api/compiler/test', {
      method: 'POST',
      body: JSON.stringify({ code, language, questionId }),
    });
  }

  // AI Generator APIs
  async generateQuestions(payload: {
    subject: string;
    topic: string;
    difficulty: string;
    numberOfQuestions: number;
    questionType: string;
    marks: number;
  }): Promise<{ questions: Question[] }> {
    return this.request('/api/ai/generate-questions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Teacher APIs
  async getTeacherExams(): Promise<Exam[]> {
    const res = await this.request<{ exams: Exam[] }>('/api/teacher/exams');
    return res.exams;
  }

  async createExam(payload: Partial<Exam>): Promise<{ exam: Exam }> {
    return this.request('/api/teacher/exams', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateExam(examId: string, payload: Partial<Exam>): Promise<{ exam: Exam }> {
    return this.request(`/api/teacher/exams/${examId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async updateExamStatus(
    examId: string,
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  ): Promise<{ success: boolean; exam: Exam }> {
    return this.request(`/api/teacher/exams/${examId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteExam(examId: string): Promise<{ success: boolean }> {
    return this.request(`/api/teacher/exams/${examId}`, {
      method: 'DELETE',
    });
  }

  async getQuestionBank(): Promise<Question[]> {
    const res = await this.request<{ questions: Question[] }>('/api/teacher/questions');
    return res.questions;
  }

  async createQuestion(payload: Partial<Question>): Promise<{ question: Question }> {
    return this.request('/api/teacher/questions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getLiveProctoringStatus(): Promise<{
    candidates: LiveCandidateStatus[];
    recentMalpracticeEvents: MalpracticeEvent[];
  }> {
    const res = await this.request<any>('/api/teacher/monitoring/live');
    return {
      candidates: res.activeStudents || [],
      recentMalpracticeEvents: res.recentEvents || [],
    };
  }

  async sendTeacherWarning(sessionId: string, message: string): Promise<{ success: boolean }> {
    return this.request(`/api/teacher/monitoring/session/${sessionId}/warn`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async terminateSession(sessionId: string, reason: string): Promise<{ success: boolean }> {
    return this.request(`/api/teacher/monitoring/session/${sessionId}/terminate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getSessionTimeline(sessionId: string): Promise<{
    session: ExamSession;
    events: MalpracticeEvent[];
  }> {
    return this.request(`/api/teacher/monitoring/session/${sessionId}/timeline`);
  }

  async getTeacherAnalytics(): Promise<{ results: ExamResult[] }> {
    const res = await this.request<any>('/api/teacher/results');
    return {
      results: res.results || [],
    };
  }

  // Recording APIs (Student)
  async startRecording(sessionId: string, mimeType?: string): Promise<{ success: boolean; recordingId: string; status: string; startedAt: string }> {
    return this.request(`/api/exam-sessions/${sessionId}/recording/start`, {
      method: 'POST',
      body: JSON.stringify({ mimeType }),
    });
  }

  async uploadRecordingChunk(
    sessionId: string,
    payload: {
      recordingId: string;
      chunkNumber: number;
      chunkBase64: string;
      mimeType?: string;
      checksum?: string;
      size?: number;
    }
  ): Promise<{ success: boolean; chunkNumber: number; uploadedChunks: number }> {
    return this.request(`/api/exam-sessions/${sessionId}/recording/chunk`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async reportRecordingInterruption(
    sessionId: string,
    recordingId: string,
    reason?: string,
    details?: string
  ): Promise<{ success: boolean; status: string }> {
    return this.request(`/api/exam-sessions/${sessionId}/recording/interruption`, {
      method: 'POST',
      body: JSON.stringify({ recordingId, reason, details }),
    });
  }

  async finalizeRecording(
    sessionId: string,
    payload: {
      recordingId?: string;
      mimeType?: string;
      durationSeconds?: number;
    }
  ): Promise<{ success: boolean; recording: ExamRecording }> {
    return this.request(`/api/exam-sessions/${sessionId}/recording/finalize`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Recording Review APIs (Teacher / Admin)
  async getRecordings(params: { search?: string; examId?: string; studentId?: string; status?: string } = {}): Promise<{
    recordings: ExamRecording[];
    count: number;
  }> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/recordings${query ? '?' + query : ''}`);
  }

  async createRecordingMetadata(payload: {
    recordingId?: string;
    examSessionId?: string;
    examId?: string;
    examTitle?: string;
    studentId?: string;
    studentName?: string;
    studentEmail?: string;
    mimeType?: string;
    totalChunks?: number;
  }): Promise<{ success: boolean; recording: ExamRecording }> {
    return this.request('/api/recordings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getRecordingById(recordingId: string): Promise<{
    recording: ExamRecording;
    session: ExamSession | null;
    result: ExamResult | null;
    chunksCount: number;
    malpracticeEventsCount: number;
  }> {
    return this.request(`/api/recordings/${recordingId}`);
  }

  async updateRecordingMetadata(
    recordingId: string,
    payload: {
      status?: string;
      auditNotes?: string;
      flaggedForAudit?: boolean;
      tags?: string[];
      retentionOverride?: boolean;
    }
  ): Promise<{ success: boolean; recording: ExamRecording }> {
    return this.request(`/api/recordings/${recordingId}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async uploadChunkDirect(
    recordingId: string,
    payload: {
      chunkNumber: number;
      chunkBase64: string;
      mimeType?: string;
      checksum?: string;
      size?: number;
    }
  ): Promise<{ success: boolean; chunkNumber: number; uploadedChunks: number; totalFileSize: number }> {
    return this.request(`/api/recordings/${recordingId}/chunks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getRecordingChunks(recordingId: string): Promise<{
    recordingId: string;
    totalChunks: number;
    uploadedCount: number;
    isComplete: boolean;
    missingChunks: number[];
    chunks: Array<{
      chunkNumber: number;
      size: number;
      uploadedAt: string;
      status: string;
    }>;
  }> {
    return this.request(`/api/recordings/${recordingId}/chunks`);
  }

  async finalizeRecordingDirect(
    recordingId: string,
    payload: {
      mimeType?: string;
      durationSeconds?: number;
    } = {}
  ): Promise<{ success: boolean; recording: ExamRecording }> {
    return this.request(`/api/recordings/${recordingId}/finalize`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async viewAuthorizedRecording(recordingId: string): Promise<{
    success: boolean;
    recording: ExamRecording;
    session: ExamSession | null;
    result: ExamResult | null;
    events: MalpracticeEvent[];
    streamUrl: string;
    token: string;
    expiresInSeconds: number;
  }> {
    return this.request(`/api/recordings/${recordingId}/view`);
  }

  async generateRecordingViewToken(recordingId: string, expiresIn = '2h'): Promise<{
    success: boolean;
    token: string;
    streamUrl: string;
  }> {
    return this.request(`/api/recordings/${recordingId}/view-token`, {
      method: 'POST',
      body: JSON.stringify({ expiresIn }),
    });
  }

  async deleteRecording(recordingId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/recordings/${recordingId}`, {
      method: 'DELETE',
    });
  }

  async getSessionRecording(sessionId: string): Promise<{
    recording: ExamRecording;
    events: MalpracticeEvent[];
    streamUrl: string;
    token: string;
  }> {
    return this.request(`/api/teacher/exam-sessions/${sessionId}/recording`);
  }

  async getTeacherRecordings(params: { search?: string; examId?: string; status?: string; securityLevel?: string } = {}): Promise<{
    recordings: ExamRecording[];
  }> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/teacher/recordings${query ? '?' + query : ''}`);
  }

  // Admin Retention APIs
  async getRecordingRetention(): Promise<RecordingRetentionConfig> {
    return this.request('/api/admin/recordings/retention');
  }

  async getRecordingRetentionPolicy(): Promise<{ config: RecordingRetentionConfig }> {
    const res = await this.getRecordingRetention();
    return { config: res };
  }

  async updateRecordingRetention(payload: Partial<RecordingRetentionConfig>): Promise<{ success: boolean; retentionConfig: RecordingRetentionConfig }> {
    return this.request('/api/admin/recordings/retention', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateRecordingRetentionPolicy(payload: Partial<RecordingRetentionConfig>): Promise<{ success: boolean; retentionConfig: RecordingRetentionConfig }> {
    return this.updateRecordingRetention(payload);
  }

  async triggerRecordingCleanup(): Promise<{ success: boolean; purgedCount: number; lastCleanupAt: string }> {
    return this.request('/api/admin/recordings/cleanup', {
      method: 'POST',
    });
  }

  async cleanupExpiredRecordings(): Promise<{ success: boolean; deletedCount: number }> {
    const res = await this.triggerRecordingCleanup();
    return { success: res.success, deletedCount: res.purgedCount };
  }

  // Admin APIs
  async getAdminUsers(): Promise<User[]> {
    const res = await this.request<{ users: User[] }>('/api/admin/users');
    return res.users;
  }

  async createAdminUser(payload: Partial<User> & { password?: string }): Promise<{ user: User }> {
    return this.request('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async toggleUserStatus(userId: string, status: 'ACTIVE' | 'DEACTIVATED'): Promise<{ success: boolean; user: User }> {
    return this.request(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getAuditLogs(params: { action?: string; role?: string; search?: string } = {}): Promise<AuditLog[]> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await this.request<{ logs: AuditLog[] }>(`/api/admin/audit-logs${query ? '?' + query : ''}`);
    return res.logs;
  }

  async getAdminStats(): Promise<any> {
    return this.request('/api/admin/system-stats');
  }
}

export const api = new ApiClient();
