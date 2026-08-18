export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  studentId?: string;
  name: string;
  role: UserRole;
  department?: string;
  batch?: string;
  status: 'ACTIVE' | 'DEACTIVATED';
  createdAt: string;
  lastLogin?: string;
}

export type QuestionType = 'MCQ' | 'CODING';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean; // Stripped for students during active exam
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean; // Hidden test cases never sent to student client
  explanation?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description: string;
  subject: string;
  topic: string;
  difficulty: DifficultyLevel;
  marks: number;
  negativeMarks?: number;
  options?: QuestionOption[];
  correctAnswer?: string; // option ID or string (stripped for students)
  explanation?: string;
  // Coding question fields
  problemStatement?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  timeLimitSec?: number;
  memoryLimitMb?: number;
  supportedLanguages?: string[];
  starterCode?: Record<string, string>; // language -> code template
  testCases?: TestCase[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ExamSettings {
  durationMinutes?: number;
  passingMarks?: number;
  maxAttempts?: number;
  negativeMarking?: boolean;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  fullscreenRequired: boolean;
  cameraRequired: boolean;
  recordExamVideo?: boolean;
  microphoneOptional?: boolean;
  autoSubmitOnSevereViolation?: boolean;
  maxViolations: number;
  allowQuestionNavigation: boolean;
  showResultsImmediately?: boolean;
  allowStudentReview: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  mcqEnabled?: boolean;
  codingEnabled?: boolean;
  shuffleQuestions?: boolean;
}

export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Exam {
  id: string;
  title: string;
  description: string;
  subject: string;
  instructions?: string;
  createdById?: string;
  createdByName?: string;
  status: ExamStatus;
  startDate: string;
  endDate: string;
  durationMinutes?: number;
  totalMarks: number;
  passingMarks?: number;
  settings: ExamSettings;
  questionIds?: string[];
  questions?: Question[];
  createdAt?: string;
  updatedAt?: string;
}

export type SessionStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'TERMINATED';
export type ProctorStatus = 'ACTIVE' | 'WARNING' | 'SUSPICIOUS' | 'CRITICAL' | 'SUBMITTED' | 'DISCONNECTED';

export type MalpracticeEventType =
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'WINDOW_FOCUS_RETURN'
  | 'FULLSCREEN_EXIT'
  | 'COPY_ATTEMPT'
  | 'PASTE_ATTEMPT'
  | 'CUT_ATTEMPT'
  | 'CONTEXT_MENU_ATTEMPT'
  | 'PRINT_ATTEMPT'
  | 'DEVTOOLS_SUSPECTED'
  | 'MOBILE_PHONE_DETECTED'
  | 'SCREEN_PHOTO_CAPTURE_ATTEMPT'
  | 'CAMERA_STOPPED'
  | 'CAMERA_REVOKED'
  | 'CAMERA_UNAVAILABLE'
  | 'CAMERA_INTERRUPTED'
  | 'RECORDING_INTERRUPTED'
  | 'RECORDING_RESUMED'
  | 'RECORDING_UPLOAD_FAILED'
  | 'FACE_NOT_DETECTED'
  | 'MULTIPLE_FACES_DETECTED'
  | 'FACE_MOVED_AWAY'
  | 'MULTIPLE_SESSION_DETECTED'
  | 'KEYBOARD_SHORTCUT_BLOCKED'
  | 'NETWORK_DISCONNECTED'
  | 'NETWORK_RECONNECTED'
  | 'TIME_EXPIRED_AUTO_SUBMIT';

export type SeverityLevel = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RecordingStatus =
  | 'NOT_STARTED'
  | 'STARTING'
  | 'RECORDING'
  | 'PAUSED'
  | 'INTERRUPTED'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'NOT_RECORDED';

export interface ExamRecordingChunk {
  id: string;
  recordingId: string;
  chunkNumber: number;
  storageKey: string;
  size: number;
  checksum?: string;
  uploadedAt: string;
  status: 'PENDING' | 'UPLOADED' | 'FAILED';
}

export interface ExamRecording {
  id: string;
  examSessionId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  examId: string;
  examTitle?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  status: RecordingStatus;
  storageKey?: string;
  streamUrl?: string;
  mimeType: string;
  fileSize: number;
  totalChunks: number;
  uploadedChunks: number;
  chunks?: ExamRecordingChunk[];
  snapshots?: Array<{
    id: string;
    timestamp: string;
    offsetSeconds: number;
    snapshotUrl: string;
    eventType?: string;
  }>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  retentionExpiresAt?: string;
}

export interface RecordingRetentionConfig {
  retentionDays: number;
  autoCleanupEnabled: boolean;
  lastCleanupAt?: string;
}

export interface MalpracticeEvent {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  examId: string;
  eventType: MalpracticeEventType;
  severity: SeverityLevel;
  scoreImpact: number;
  timestamp: string;
  browserInfo?: string;
  currentQuestionId?: string;
  description: string;
  actionTaken?: string;
  snapshotUrl?: string;
  snapshotBase64?: string;
}

export interface StudentAnswer {
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
  codeAnswer?: string;
  codeLanguage?: string;
  isFlagged?: boolean;
  updatedAt: string;
}

export interface ExamSession {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: SessionStatus;
  proctorStatus: ProctorStatus;
  startTime: string;
  endTime: string;
  expiresAt: string;
  answers: Record<string, StudentAnswer>; // questionId -> StudentAnswer
  questionOrder: string[]; // randomized question IDs
  optionOrders?: Record<string, string[]>; // questionId -> randomized option IDs
  violationCount: number;
  suspicionScore: number;
  cameraActive: boolean;
  fullscreenActive: boolean;
  recordingId?: string;
  recordingStatus?: RecordingStatus;
  lastHeartbeat: string;
  submittedAt?: string;
  clientIp?: string;
  userAgent?: string;
}

export interface QuestionResult {
  questionId: string;
  questionTitle: string;
  type: QuestionType;
  maxMarks: number;
  marksObtained: number;
  isCorrect: boolean;
  selectedOptionId?: string;
  correctOptionId?: string;
  explanation?: string;
  codeSubmission?: {
    code: string;
    language: string;
    passedTestCases: number;
    totalTestCases: number;
  };
}

export interface ExamResult {
  id: string;
  sessionId: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  correctAnswersCount: number;
  incorrectAnswersCount: number;
  unansweredCount: number;
  timeSpentSeconds: number;
  submittedAt: string;
  submissionType: 'MANUAL' | 'AUTO_TIME_EXPIRED' | 'AUTO_MALPRACTICE';
  suspicionScore: number;
  violationCount: number;
  recordingId?: string;
  recordingStatus?: RecordingStatus;
  questionResults: QuestionResult[];
  settings: {
    allowStudentReview: boolean;
    showCorrectAnswers: boolean;
    showExplanations: boolean;
  };
}

export interface LiveCandidateStatus {
  sessionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  examTitle: string;
  status: SessionStatus;
  proctorStatus: ProctorStatus;
  cameraActive: boolean;
  fullscreenActive: boolean;
  recordingActive?: boolean;
  recordingStatus?: RecordingStatus;
  recordingId?: string;
  violationCount: number;
  suspicionScore: number;
  answeredCount: number;
  totalQuestions: number;
  progressPercentage: number;
  lastHeartbeat: string;
  timeRemainingSeconds: number;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorName?: string;
  userName?: string;
  role?: UserRole;
  action: string;
  entity?: string;
  entityId?: string;
  details?: string;
  severity?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  createdAt: string;
  isRead: boolean;
}
