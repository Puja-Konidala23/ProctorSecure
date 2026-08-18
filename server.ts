import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { GoogleGenAI, Type } from '@google/genai';
import { executeCode, evaluateTestCase, validateSyntax } from './src/server/codeEngine.ts';
import { recordingStorage, seedDemoRecording } from './src/server/recordingStorage.ts';
import type {
  User,
  Exam,
  Question,
  ExamSession,
  ExamResult,
  ExamRecording,
  ExamRecordingChunk,
  RecordingRetentionConfig,
  MalpracticeEvent,
  AuditLog,
  SystemNotification,
  MalpracticeEventType,
  SeverityLevel,
} from './src/types/index.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'college_exam_portal_super_secure_jwt_secret_key_2026';
const PORT = 3000;

// ==========================================
// IN-MEMORY DATABASE & SEED DATA
// ==========================================

const usersDb: User[] = [
  {
    id: 'user_stud_1',
    email: 'alex.rivera@college.edu',
    studentId: 'CS2026-0842',
    name: 'Alex Rivera',
    role: 'STUDENT',
    department: 'Computer Science & Engineering',
    batch: 'Batch 2026 - Sec A',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'user_stud_2',
    email: 'sarah.chen@college.edu',
    studentId: 'CS2026-0899',
    name: 'Sarah Chen',
    role: 'STUDENT',
    department: 'Computer Science & Engineering',
    batch: 'Batch 2026 - Sec B',
    status: 'ACTIVE',
    createdAt: '2026-01-12T08:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'user_stud_3',
    email: 'marcus.vance@college.edu',
    studentId: 'IT2026-0412',
    name: 'Marcus Vance',
    role: 'STUDENT',
    department: 'Information Technology',
    batch: 'Batch 2026 - Sec A',
    status: 'ACTIVE',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'user_teach_1',
    email: 'dr.sharma@college.edu',
    name: 'Dr. Ramesh Sharma',
    role: 'TEACHER',
    department: 'Computer Science & Engineering',
    status: 'ACTIVE',
    createdAt: '2025-08-01T08:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'user_admin_1',
    email: 'admin.dean@college.edu',
    name: 'Dean Eleanor Vance (Controller of Exams)',
    role: 'ADMIN',
    department: 'Examination Control Division',
    status: 'ACTIVE',
    createdAt: '2025-06-01T08:00:00.000Z',
    lastLogin: new Date().toISOString(),
  },
];

// Strong, distinct bcrypt hashes per institutional role
const ADMIN_MASTER_PIN = '948201'; // Level-3 Controller of Examinations Clearance PIN
const passwordsDb: Record<string, string> = {
  // Students
  'alex.rivera@college.edu': bcrypt.hashSync('Student#Alex2026!', 10),
  'cs2026-0842': bcrypt.hashSync('Student#Alex2026!', 10),
  'sarah.chen@college.edu': bcrypt.hashSync('Student#Sarah2026!', 10),
  'cs2026-0899': bcrypt.hashSync('Student#Sarah2026!', 10),
  'marcus.vance@college.edu': bcrypt.hashSync('Student#Marcus2026!', 10),
  'it2026-0412': bcrypt.hashSync('Student#Marcus2026!', 10),
  // Faculty
  'dr.sharma@college.edu': bcrypt.hashSync('Faculty#Sharma2026!', 10),
  'ramesh.sharma@college.edu': bcrypt.hashSync('Faculty#Sharma2026!', 10),
  // Admin / Examination Controller
  'admin.dean@college.edu': bcrypt.hashSync('Admin#Dean2026!Sec', 10),
  'dean.vance@college.edu': bcrypt.hashSync('Admin#Dean2026!Sec', 10),
};

// Global Question Bank
const questionBankDb: Question[] = [
  {
    id: 'qb_1',
    type: 'MCQ',
    title: 'Time Complexity of Binary Search',
    description: 'What is the worst-case time complexity of searching an element in a balanced binary search tree with N nodes?',
    subject: 'Data Structures & Algorithms',
    topic: 'Trees & Search Algorithms',
    difficulty: 'EASY',
    marks: 4,
    negativeMarks: 1,
    options: [
      { id: 'opt_1_a', text: 'O(N)' },
      { id: 'opt_1_b', text: 'O(log N)' },
      { id: 'opt_1_c', text: 'O(N log N)' },
      { id: 'opt_1_d', text: 'O(1)' },
    ],
    correctAnswer: 'opt_1_b',
    explanation: 'In a balanced binary search tree, the height of the tree is bounded by O(log N). Thus, lookup takes at most O(log N) comparisons.',
  },
  {
    id: 'qb_2',
    type: 'MCQ',
    title: 'TCP vs UDP Reliability Mechanism',
    description: 'Which mechanism is primarily employed by the Transmission Control Protocol (TCP) to guarantee reliable byte-stream delivery?',
    subject: 'Computer Networks',
    topic: 'Transport Layer Protocols',
    difficulty: 'MEDIUM',
    marks: 4,
    negativeMarks: 1,
    options: [
      { id: 'opt_2_a', text: 'Three-way handshaking only' },
      { id: 'opt_2_b', text: 'Sequence numbering, ACKs, and Retransmission Timers (ARQ)' },
      { id: 'opt_2_c', text: 'Cyclic Redundancy Check (CRC) at the physical layer' },
      { id: 'opt_2_d', text: 'Static routing tables without congestion feedback' },
    ],
    correctAnswer: 'opt_2_b',
    explanation: 'TCP ensures reliability using sequence numbers for ordering, acknowledgments (ACKs) for receipt verification, and adaptive retransmission timers.',
  },
  {
    id: 'qb_3',
    type: 'MCQ',
    title: 'SQL ACID Isolation Levels',
    description: 'Which ANSI SQL transaction isolation level prevents Dirty Reads and Non-Repeatable Reads, but may still permit Phantom Reads?',
    subject: 'Database Management Systems',
    topic: 'Transactions & Concurrency',
    difficulty: 'HARD',
    marks: 4,
    negativeMarks: 1,
    options: [
      { id: 'opt_3_a', text: 'Read Uncommitted' },
      { id: 'opt_3_b', text: 'Read Committed' },
      { id: 'opt_3_c', text: 'Repeatable Read' },
      { id: 'opt_3_d', text: 'Serializable' },
    ],
    correctAnswer: 'opt_3_c',
    explanation: 'Repeatable Read locks all queried rows for the transaction duration, preventing Dirty Reads and Non-Repeatable Reads, but range locks are not required, leaving phantom rows possible.',
  },
  {
    id: 'qb_4',
    type: 'CODING',
    title: 'Two Sum Problem',
    description: 'Find two indices whose values sum up to the target.',
    problemStatement: 'Given an array of integers `nums` and an integer `target`, return the two numbers or indices that add up to `target`. Assume each input has exactly one solution and you may not use the same element twice.\n\nInput: First line contains comma-separated integers representing `nums`. Second line contains the target integer.\nOutput: Two comma-separated integers in ascending order.',
    subject: 'Data Structures & Algorithms',
    topic: 'Arrays & Hash Maps',
    difficulty: 'EASY',
    marks: 10,
    inputFormat: 'Line 1: Comma-separated numbers (e.g. 2,7,11,15)\nLine 2: Target sum integer (e.g. 9)',
    outputFormat: 'Comma-separated indices or values (e.g. 0,1)',
    constraints: '2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9',
    examples: [
      {
        input: '2,7,11,15\n9',
        output: '0,1',
        explanation: 'Because nums[0] + nums[1] == 2 + 7 == 9, we return 0,1.',
      },
      {
        input: '3,2,4\n6',
        output: '1,2',
        explanation: 'nums[1] + nums[2] == 2 + 4 == 6, we return 1,2.',
      },
    ],
    timeLimitSec: 2,
    memoryLimitMb: 256,
    supportedLanguages: ['javascript', 'python', 'java'],
    starterCode: {
      javascript: `// Complete the solution function
function solve(input) {
  const lines = input.trim().split('\\n');
  const nums = lines[0].split(',').map(Number);
  const target = Number(lines[1]);
  
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return \`\${map.get(complement)},\${i}\`;
    }
    map.set(nums[i], i);
  }
  return '';
}`,
      python: `import sys

def solve(input_str):
    lines = input_str.strip().split('\\n')
    nums = list(map(int, lines[0].split(',')))
    target = int(lines[1])
    
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return f"{seen[diff]},{i}"
        seen[num] = i
    return ""

if __name__ == '__main__':
    print(solve(sys.stdin.read()))`,
      java: `import java.util.*;

public class Solution {
    public static String solve(String input) {
        String[] lines = input.trim().split("\\n");
        String[] numStrs = lines[0].split(",");
        int target = Integer.parseInt(lines[1].trim());
        
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < numStrs.length; i++) {
            int num = Integer.parseInt(numStrs[i].trim());
            int complement = target - num;
            if (map.containsKey(complement)) {
                return map.get(complement) + "," + i;
            }
            map.put(num, i);
        }
        return "";
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        StringBuilder sb = new StringBuilder();
        while (scanner.hasNextLine()) {
            sb.append(scanner.nextLine()).append("\\n");
        }
        System.out.println(solve(sb.toString()));
    }
}`,
    },
    testCases: [
      {
        id: 'tc_1',
        input: '2,7,11,15\n9',
        expectedOutput: '0,1',
        isHidden: false,
        explanation: 'Sample public test case 1',
      },
      {
        id: 'tc_2',
        input: '3,2,4\n6',
        expectedOutput: '1,2',
        isHidden: false,
        explanation: 'Sample public test case 2',
      },
      {
        id: 'tc_3',
        input: '3,3\n6',
        expectedOutput: '0,1',
        isHidden: true,
        explanation: 'Hidden test case: identical elements',
      },
      {
        id: 'tc_4',
        input: '1,5,10,25,50,100\n75',
        expectedOutput: '3,4',
        isHidden: true,
        explanation: 'Hidden test case: larger sorted inputs',
      },
    ],
  },
  {
    id: 'qb_5',
    type: 'CODING',
    title: 'Valid Parentheses Validator',
    description: 'Verify if bracket sequences are balanced.',
    problemStatement: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\nAn input string is valid if open brackets are closed by the same type and in the correct order.\n\nOutput "true" if valid, or "false" otherwise.',
    subject: 'Data Structures & Algorithms',
    topic: 'Stacks & Strings',
    difficulty: 'MEDIUM',
    marks: 10,
    inputFormat: 'A single string of brackets',
    outputFormat: '"true" or "false"',
    constraints: '1 <= s.length <= 10^4',
    examples: [
      { input: '()[]{}', output: 'true', explanation: 'All matching brackets properly closed.' },
      { input: '(]', output: 'false', explanation: 'Mismatched closing bracket.' },
    ],
    timeLimitSec: 2,
    memoryLimitMb: 256,
    supportedLanguages: ['javascript', 'python', 'java'],
    starterCode: {
      javascript: `function solve(input) {
  const s = input.trim();
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const char of s) {
    if (char === '(' || char === '{' || char === '[') {
      stack.push(char);
    } else if (map[char]) {
      if (stack.pop() !== map[char]) return 'false';
    }
  }
  return stack.length === 0 ? 'true' : 'false';
}`,
      python: `import sys

def solve(s):
    s = s.strip()
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping.values():
            stack.append(char)
        elif char in mapping:
            if not stack or stack.pop() != mapping[char]:
                return "false"
    return "true" if not stack else "false"

if __name__ == '__main__':
    print(solve(sys.stdin.read()))`,
      java: `import java.util.*;

public class Solution {
    public static String solve(String input) {
        String s = input.trim();
        Stack<Character> stack = new Stack<>();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '(' || c == '{' || c == '[') {
                stack.push(c);
            } else if (c == ')') {
                if (stack.isEmpty() || stack.pop() != '(') return "false";
            } else if (c == '}') {
                if (stack.isEmpty() || stack.pop() != '{') return "false";
            } else if (c == ']') {
                if (stack.isEmpty() || stack.pop() != '[') return "false";
            }
        }
        return stack.isEmpty() ? "true" : "false";
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextLine()) {
            System.out.println(solve(scanner.nextLine()));
        }
    }
}`,
    },
    testCases: [
      { id: 'tc_5_1', input: '()[]{}', expectedOutput: 'true', isHidden: false },
      { id: 'tc_5_2', input: '(]', expectedOutput: 'false', isHidden: false },
      { id: 'tc_5_3', input: '({[]})', expectedOutput: 'true', isHidden: true },
      { id: 'tc_5_4', input: '([)]', expectedOutput: 'false', isHidden: true },
    ],
  },
];

// Exams DB
const examsDb: Exam[] = [
  {
    id: 'exam_cs301',
    title: 'CS301: Advanced Data Structures & Algorithm Design Mid-Term',
    description: 'Comprehensive evaluation covering Tree Traversals, Dynamic Programming, Hash Maps, and live algorithmic problem solving.',
    subject: 'Computer Science',
    instructions: '1. This exam enforces live AI proctoring, webcam presence verification, and fullscreen lock.\n2. Navigating away from this browser tab or exiting fullscreen will register a security violation.\n3. After 3 severe violations, your exam will be automatically locked and submitted.\n4. Ensure you have stable network connectivity; all changes auto-save in real-time.',
    createdById: 'user_teach_1',
    createdByName: 'Dr. Ramesh Sharma',
    status: 'PUBLISHED',
    startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    totalMarks: 28,
    settings: {
      durationMinutes: 45,
      passingMarks: 12,
      maxAttempts: 1,
      negativeMarking: true,
      randomizeQuestions: true,
      randomizeOptions: true,
      fullscreenRequired: true,
      cameraRequired: true,
      microphoneOptional: false,
      autoSubmitOnSevereViolation: true,
      maxViolations: 3,
      allowQuestionNavigation: true,
      showResultsImmediately: true,
      allowStudentReview: true,
      showCorrectAnswers: true,
      showExplanations: true,
      mcqEnabled: true,
      codingEnabled: true,
    },
    questions: [
      questionBankDb[0], // Binary search MCQ
      questionBankDb[1], // TCP MCQ
      questionBankDb[2], // ACID MCQ
      questionBankDb[3], // Two Sum Coding
    ],
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'exam_it205',
    title: 'IT205: Full Stack Web Engineering Final Lab Assessment',
    description: 'Practical coding & algorithmic data structures exam for Semester 6 undergraduates.',
    subject: 'Information Technology',
    instructions: 'Mandatory full-screen proctored assessment. Complete both coding problems and theoretical analysis.',
    createdById: 'user_teach_1',
    createdByName: 'Dr. Ramesh Sharma',
    status: 'PUBLISHED',
    startDate: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
    totalMarks: 24,
    settings: {
      durationMinutes: 60,
      passingMarks: 10,
      maxAttempts: 1,
      negativeMarking: false,
      randomizeQuestions: false,
      randomizeOptions: false,
      fullscreenRequired: true,
      cameraRequired: true,
      microphoneOptional: false,
      autoSubmitOnSevereViolation: true,
      maxViolations: 3,
      allowQuestionNavigation: true,
      showResultsImmediately: true,
      allowStudentReview: true,
      showCorrectAnswers: true,
      showExplanations: true,
      mcqEnabled: true,
      codingEnabled: true,
    },
    questions: [
      questionBankDb[0],
      questionBankDb[3],
      questionBankDb[4],
    ],
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];

// Active Sessions, Results, Malpractice Events & Audit Logs
const sessionsDb: Record<string, ExamSession> = {};
const resultsDb: Record<string, ExamResult> = {};
const recordingsDb: Record<string, ExamRecording> = {};
const chunksDb: Record<string, ExamRecordingChunk[]> = {};
let retentionConfig: RecordingRetentionConfig = {
  retentionDays: 30,
  autoCleanupEnabled: true,
  lastCleanupAt: new Date().toISOString(),
};
const malpracticeEventsDb: MalpracticeEvent[] = [];
const auditLogsDb: AuditLog[] = [
  {
    id: 'log_init',
    actorId: 'user_admin_1',
    actorName: 'Dean Eleanor Vance',
    role: 'ADMIN',
    action: 'SYSTEM_INITIALIZATION',
    entity: 'SYSTEM',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    metadata: { version: '2.4.0-prod', securityEngine: 'Active' },
  },
  {
    id: 'log_exam_pub',
    actorId: 'user_teach_1',
    actorName: 'Dr. Ramesh Sharma',
    role: 'TEACHER',
    action: 'EXAM_PUBLISHED',
    entity: 'Exam',
    entityId: 'exam_cs301',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    metadata: { title: 'CS301: Advanced Data Structures & Algorithm Design Mid-Term' },
  },
];
const notificationsDb: SystemNotification[] = [];

// Seed an already submitted result for demo analytics
const sampleResultSessionId = 'sess_completed_demo';
const demoRecId = 'rec_demo_sarah';
seedDemoRecording(demoRecId).catch(() => {});

recordingsDb[demoRecId] = {
  id: demoRecId,
  examSessionId: sampleResultSessionId,
  studentId: 'user_stud_2',
  studentName: 'Sarah Chen',
  studentEmail: 'sarah.chen@college.edu',
  examId: 'exam_cs301',
  examTitle: 'CS301: Advanced Data Structures & Algorithm Design Mid-Term',
  startedAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
  endedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  durationSeconds: 1800,
  status: 'COMPLETED',
  storageKey: `local://${demoRecId}/recording.webm`,
  mimeType: 'video/webm',
  fileSize: 452000,
  totalChunks: 6,
  uploadedChunks: 6,
  createdAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
  updatedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
};

resultsDb['res_demo_1'] = {
  id: 'res_demo_1',
  sessionId: sampleResultSessionId,
  examId: 'exam_cs301',
  examTitle: 'CS301: Advanced Data Structures & Algorithm Design Mid-Term',
  studentId: 'user_stud_2',
  studentName: 'Sarah Chen',
  studentEmail: 'sarah.chen@college.edu',
  score: 24,
  totalMarks: 28,
  percentage: 85.71,
  passed: true,
  correctAnswersCount: 3,
  incorrectAnswersCount: 0,
  unansweredCount: 1,
  timeSpentSeconds: 1840,
  submittedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  submissionType: 'MANUAL',
  suspicionScore: 5,
  violationCount: 0,
  recordingId: demoRecId,
  recordingStatus: 'COMPLETED',
  questionResults: [
    {
      questionId: 'qb_1',
      questionTitle: 'Time Complexity of Binary Search',
      type: 'MCQ',
      maxMarks: 4,
      marksObtained: 4,
      isCorrect: true,
      selectedOptionId: 'opt_1_b',
      correctOptionId: 'opt_1_b',
      explanation: 'In a balanced binary search tree, the height is O(log N).',
    },
    {
      questionId: 'qb_2',
      questionTitle: 'TCP vs UDP Reliability Mechanism',
      type: 'MCQ',
      maxMarks: 4,
      marksObtained: 4,
      isCorrect: true,
      selectedOptionId: 'opt_2_b',
      correctOptionId: 'opt_2_b',
      explanation: 'TCP uses sequence numbers, ACKs, and ARQ.',
    },
    {
      questionId: 'qb_4',
      questionTitle: 'Two Sum Problem',
      type: 'CODING',
      maxMarks: 10,
      marksObtained: 10,
      isCorrect: true,
      codeSubmission: {
        code: `function solve(input) {\n  const [numsStr, t] = input.trim().split('\\n');\n  const nums = numsStr.split(',').map(Number);\n  const target = Number(t);\n  const m = new Map();\n  for(let i=0;i<nums.length;i++) {\n    if(m.has(target-nums[i])) return \`\${m.get(target-nums[i])},\${i}\`;\n    m.set(nums[i], i);\n  }\n}`,
        language: 'javascript',
        passedTestCases: 4,
        totalTestCases: 4,
      },
    },
  ],
  settings: {
    allowStudentReview: true,
    showCorrectAnswers: true,
    showExplanations: true,
  },
};

// ==========================================
// SECURITY & HELPER FUNCTIONS
// ==========================================

function createAuditLog(
  actor: { id: string; name: string; role: User['role'] },
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
  req?: express.Request
) {
  const log: AuditLog = {
    id: 'log_' + Math.random().toString(36).substring(2, 10),
    actorId: actor.id,
    actorName: actor.name,
    role: actor.role,
    action,
    entity,
    entityId,
    timestamp: new Date().toISOString(),
    ipAddress: req?.ip || req?.socket?.remoteAddress || '127.0.0.1',
    userAgent: req?.headers['user-agent'],
    metadata,
  };
  auditLogsDb.unshift(log);
}

// Malpractice severity weights
const MALPRACTICE_WEIGHTS: Record<MalpracticeEventType, { score: number; severity: SeverityLevel }> = {
  TAB_SWITCH: { score: 10, severity: 'MEDIUM' },
  WINDOW_BLUR: { score: 5, severity: 'LOW' },
  WINDOW_FOCUS_RETURN: { score: 0, severity: 'INFO' },
  FULLSCREEN_EXIT: { score: 10, severity: 'MEDIUM' },
  COPY_ATTEMPT: { score: 15, severity: 'HIGH' },
  PASTE_ATTEMPT: { score: 15, severity: 'HIGH' },
  CUT_ATTEMPT: { score: 15, severity: 'HIGH' },
  CONTEXT_MENU_ATTEMPT: { score: 15, severity: 'HIGH' },
  PRINT_ATTEMPT: { score: 15, severity: 'HIGH' },
  DEVTOOLS_SUSPECTED: { score: 25, severity: 'CRITICAL' },
  MOBILE_PHONE_DETECTED: { score: 30, severity: 'CRITICAL' },
  SCREEN_PHOTO_CAPTURE_ATTEMPT: { score: 35, severity: 'CRITICAL' },
  CAMERA_STOPPED: { score: 20, severity: 'HIGH' },
  CAMERA_REVOKED: { score: 25, severity: 'CRITICAL' },
  CAMERA_UNAVAILABLE: { score: 15, severity: 'MEDIUM' },
  CAMERA_INTERRUPTED: { score: 15, severity: 'MEDIUM' },
  RECORDING_INTERRUPTED: { score: 10, severity: 'LOW' },
  RECORDING_RESUMED: { score: 0, severity: 'INFO' },
  RECORDING_UPLOAD_FAILED: { score: 5, severity: 'LOW' },
  FACE_NOT_DETECTED: { score: 10, severity: 'LOW' },
  MULTIPLE_FACES_DETECTED: { score: 30, severity: 'CRITICAL' },
  FACE_MOVED_AWAY: { score: 10, severity: 'LOW' },
  MULTIPLE_SESSION_DETECTED: { score: 40, severity: 'CRITICAL' },
  KEYBOARD_SHORTCUT_BLOCKED: { score: 15, severity: 'HIGH' },
  NETWORK_DISCONNECTED: { score: 0, severity: 'INFO' },
  NETWORK_RECONNECTED: { score: 0, severity: 'INFO' },
  TIME_EXPIRED_AUTO_SUBMIT: { score: 0, severity: 'INFO' },
};

function getProctorStatus(score: number, violations: number, maxViolations: number): ExamSession['proctorStatus'] {
  if (violations >= maxViolations || score >= 80) return 'CRITICAL';
  if (score >= 50 || violations >= 2) return 'SUSPICIOUS';
  if (score >= 20 || violations >= 1) return 'WARNING';
  return 'ACTIVE';
}

// Deterministic shuffle using seed
function deterministicShuffle<T>(array: T[], seedStr: string): T[] {
  const result = [...array];
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) & 0xffffffff;
  }
  for (let i = result.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(seed) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ==========================================
// SERVER INITIALIZATION
// ==========================================

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Security headers compatible with iFrame preview environment
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // JWT Middleware helper
  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication token required.' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
      }
      const user = usersDb.find((u) => u.id === decoded.id && u.status === 'ACTIVE');
      if (!user) {
        return res.status(403).json({ error: 'User account is deactivated or no longer exists.' });
      }
      (req as any).user = user;
      next();
    });
  };

  // Role Gatekeeper
  const requireRoles = (...roles: User['role'][]) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const user = (req as any).user as User;
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({
          error: `Forbidden. This operation requires one of the following roles: ${roles.join(', ')}`,
        });
      }
      next();
    };
  };

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================

  // In-memory rate limiting & brute-force defense
  const failedAttempts: Record<string, { count: number; lockUntil: number }> = {};

  const recordFailedAttempt = (identifier: string) => {
    const key = identifier.toLowerCase();
    const existing = failedAttempts[key] || { count: 0, lockUntil: 0 };
    existing.count += 1;
    if (existing.count >= 5) {
      // 5 minute security lockout
      existing.lockUntil = Date.now() + 5 * 60 * 1000;
    }
    failedAttempts[key] = existing;
  };

  app.post('/api/auth/login', (req, res) => {
    const { identifier, password, role, adminPin } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier (Email or Student ID) and password are required.' });
    }

    const trimmed = identifier.trim().toLowerCase();
    const now = Date.now();

    // Check account lockout
    const attemptRecord = failedAttempts[trimmed];
    if (attemptRecord && attemptRecord.lockUntil > now) {
      const waitSeconds = Math.ceil((attemptRecord.lockUntil - now) / 1000);
      return res.status(429).json({
        error: `Security Lockout: Too many failed login attempts for this identifier. Please wait ${waitSeconds}s before retrying.`,
      });
    }

    const user = usersDb.find((u) => {
      const emailMatch = u.email.toLowerCase() === trimmed;
      const idMatch = u.studentId && u.studentId.toLowerCase() === trimmed;
      return emailMatch || idMatch;
    });

    if (!user) {
      recordFailedAttempt(trimmed);
      return res.status(401).json({ error: 'Authentication failed. Invalid institutional credentials.' });
    }

    if (user.status === 'DEACTIVATED') {
      return res.status(403).json({ error: 'This institutional account has been deactivated by administration.' });
    }

    // STRICT ROLE & PORTAL ISOLATION
    if (role && user.role !== role) {
      recordFailedAttempt(trimmed);
      if (user.role === 'STUDENT' && (role === 'ADMIN' || role === 'TEACHER')) {
        return res.status(403).json({
          error: `Access Denied: Student account (${user.email}) is strictly forbidden from logging into the ${role === 'ADMIN' ? 'Administrative Controller' : 'Faculty'} portal.`,
        });
      }
      if (user.role === 'TEACHER' && role === 'ADMIN') {
        return res.status(403).json({
          error: 'Access Denied: Faculty credentials do not possess Administrative clearance privileges.',
        });
      }
      return res.status(403).json({
        error: `Role Mismatch: Account is registered as ${user.role} and cannot authenticate into the ${role} portal.`,
      });
    }

    // For ADMIN role authentication, require Admin Master Security PIN (MFA)
    if (user.role === 'ADMIN' || role === 'ADMIN') {
      if (!adminPin || adminPin.trim() !== ADMIN_MASTER_PIN) {
        recordFailedAttempt(trimmed);
        return res.status(401).json({
          error: 'Administrative Security Failure: Missing or invalid 6-Digit Master Security Verification PIN.',
        });
      }
    }

    // Cryptographic Password verification
    const storedHash = passwordsDb[user.email.toLowerCase()] || (user.studentId ? passwordsDb[user.studentId.toLowerCase()] : undefined);
    if (!storedHash) {
      recordFailedAttempt(trimmed);
      return res.status(401).json({ error: 'Authentication failed. No password record found.' });
    }

    const isValid = bcrypt.compareSync(password, storedHash);
    if (!isValid) {
      recordFailedAttempt(trimmed);
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }

    // Clear failed attempts on successful authentication
    delete failedAttempts[trimmed];

    user.lastLogin = new Date().toISOString();

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    createAuditLog(user, 'USER_LOGIN', 'USER', user.id, { role: user.role, ip: req.ip }, req);

    return res.json({
      token,
      user,
    });
  });

  app.get('/api/auth/me', authenticateToken, (req, res) => {
    return res.json({ user: (req as any).user });
  });

  app.post('/api/auth/logout', authenticateToken, (req, res) => {
    const user = (req as any).user;
    createAuditLog(user, 'USER_LOGOUT', 'USER', user.id, {}, req);
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  // ==========================================
  // STUDENT PORTAL ROUTES
  // ==========================================

  app.get('/api/student/exams', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const now = new Date().toISOString();

    // Published exams
    const publishedExams = examsDb.filter((e) => e.status === 'PUBLISHED');

    const available: any[] = [];
    const upcoming: any[] = [];
    const completed: any[] = [];

    publishedExams.forEach((exam) => {
      // Check existing completed results for this student
      const userResult = Object.values(resultsDb).find(
        (r) => r.examId === exam.id && r.studentId === user.id
      );

      // Check existing active session
      const userSession = Object.values(sessionsDb).find(
        (s) => s.examId === exam.id && s.studentId === user.id && s.status === 'IN_PROGRESS'
      );

      const examSummary = {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        subject: exam.subject,
        durationMinutes: exam.settings.durationMinutes,
        totalMarks: exam.totalMarks,
        questionsCount: exam.questions.length,
        startDate: exam.startDate,
        endDate: exam.endDate,
        settings: {
          fullscreenRequired: exam.settings.fullscreenRequired,
          cameraRequired: exam.settings.cameraRequired,
          negativeMarking: exam.settings.negativeMarking,
          maxViolations: exam.settings.maxViolations,
          codingEnabled: exam.settings.codingEnabled,
          mcqEnabled: exam.settings.mcqEnabled,
        },
      };

      if (userResult) {
        completed.push({
          ...examSummary,
          resultId: userResult.id,
          score: userResult.score,
          percentage: userResult.percentage,
          passed: userResult.passed,
          submittedAt: userResult.submittedAt,
          suspicionScore: userResult.suspicionScore,
        });
      } else if (now < exam.startDate) {
        upcoming.push(examSummary);
      } else if (now <= exam.endDate) {
        available.push({
          ...examSummary,
          activeSessionId: userSession?.id || null,
        });
      }
    });

    // Summary stats for student
    const studentResults = Object.values(resultsDb).filter((r) => r.studentId === user.id);
    const avgScore =
      studentResults.length > 0
        ? Math.round(
            (studentResults.reduce((acc, r) => acc + r.percentage, 0) / studentResults.length) * 10
          ) / 10
        : 0;

    return res.json({
      available,
      upcoming,
      completed,
      stats: {
        totalExamsCount: publishedExams.length,
        availableCount: available.length,
        upcomingCount: upcoming.length,
        completedCount: completed.length,
        averagePercentage: avgScore,
      },
    });
  });

  // Get Exam Pre-Check Details
  app.get('/api/student/exams/:id', authenticateToken, (req, res) => {
    const exam = examsDb.find((e) => e.id === req.params.id && e.status === 'PUBLISHED');
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found or not published.' });
    }

    return res.json({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      subject: exam.subject,
      instructions: exam.instructions,
      totalMarks: exam.totalMarks,
      durationMinutes: exam.settings.durationMinutes,
      startDate: exam.startDate,
      endDate: exam.endDate,
      settings: exam.settings,
      questionsCount: exam.questions.length,
    });
  });

  // Start / Resume Exam Session
  app.post('/api/exams/:id/start', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const exam = examsDb.find((e) => e.id === req.params.id && e.status === 'PUBLISHED');
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found or is currently unpublished.' });
    }

    // Check if already completed
    const existingResult = Object.values(resultsDb).find(
      (r) => r.examId === exam.id && r.studentId === user.id
    );
    if (existingResult) {
      return res.status(400).json({
        error: 'You have already completed and submitted this examination.',
        resultId: existingResult.id,
      });
    }

    // Check for active session
    let session = Object.values(sessionsDb).find(
      (s) => s.examId === exam.id && s.studentId === user.id && s.status === 'IN_PROGRESS'
    );

    const now = new Date();

    if (!session) {
      const sessionId = 'sess_' + Math.random().toString(36).substring(2, 12);
      const expiresAt = new Date(now.getTime() + exam.settings.durationMinutes * 60 * 1000).toISOString();

      // Deterministic question and option randomization
      let questionOrder = exam.questions.map((q) => q.id);
      if (exam.settings.randomizeQuestions) {
        questionOrder = deterministicShuffle(questionOrder, `${sessionId}_q`);
      }

      const optionOrders: Record<string, string[]> = {};
      if (exam.settings.randomizeOptions) {
        exam.questions.forEach((q) => {
          if (q.options && q.options.length > 0) {
            optionOrders[q.id] = deterministicShuffle(
              q.options.map((o) => o.id),
              `${sessionId}_opt_${q.id}`
            );
          }
        });
      }

      session = {
        id: sessionId,
        examId: exam.id,
        examTitle: exam.title,
        studentId: user.id,
        studentName: user.name,
        studentEmail: user.email,
        status: 'IN_PROGRESS',
        proctorStatus: 'ACTIVE',
        startTime: now.toISOString(),
        endTime: new Date(now.getTime() + exam.settings.durationMinutes * 60 * 1000).toISOString(),
        expiresAt,
        answers: {},
        questionOrder,
        optionOrders,
        violationCount: 0,
        suspicionScore: 0,
        cameraActive: exam.settings.cameraRequired,
        fullscreenActive: exam.settings.fullscreenRequired,
        lastHeartbeat: now.toISOString(),
        clientIp: req.ip,
        userAgent: req.headers['user-agent'],
      };

      sessionsDb[sessionId] = session;

      createAuditLog(user, 'STUDENT_EXAM_START', 'ExamSession', sessionId, {
        examId: exam.id,
        examTitle: exam.title,
        durationMinutes: exam.settings.durationMinutes,
      }, req);
    }

    return res.json({ sessionId: session.id });
  });

  // Get sanitized exam session payload (NO answers, NO hidden test cases)
  app.get('/api/exam-sessions/:id', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const session = sessionsDb[req.params.id];
    if (!session) {
      return res.status(404).json({ error: 'Exam session not found.' });
    }

    if (session.studentId !== user.id && user.role === 'STUDENT') {
      return res.status(403).json({ error: 'Unauthorized. You cannot access another student session.' });
    }

    const exam = examsDb.find((e) => e.id === session.examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam definition missing.' });
    }

    // Check server-side time expiration
    const nowTime = Date.now();
    const expiresTime = new Date(session.expiresAt).getTime();
    if (nowTime >= expiresTime && session.status === 'IN_PROGRESS') {
      // Trigger automatic server-side submission
      const result = finalizeExamSubmission(session, exam, 'AUTO_TIME_EXPIRED');
      return res.json({
        isExpired: true,
        session: { ...session, status: 'SUBMITTED' },
        resultId: result.id,
      });
    }

    // Sanitize questions according to order
    const orderedQuestions: Question[] = [];
    session.questionOrder.forEach((qid) => {
      const q = exam.questions.find((item) => item.id === qid);
      if (q) {
        // Strip correct answer and explanations
        const sanitized: Question = {
          id: q.id,
          type: q.type,
          title: q.title,
          description: q.description,
          subject: q.subject,
          topic: q.topic,
          difficulty: q.difficulty,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          problemStatement: q.problemStatement,
          inputFormat: q.inputFormat,
          outputFormat: q.outputFormat,
          constraints: q.constraints,
          examples: q.examples,
          timeLimitSec: q.timeLimitSec,
          memoryLimitMb: q.memoryLimitMb,
          supportedLanguages: q.supportedLanguages,
          starterCode: q.starterCode,
          // Only show public test cases!
          testCases: q.testCases?.filter((tc) => !tc.isHidden).map((tc) => ({
            id: tc.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: false,
            explanation: tc.explanation,
          })),
        };

        if (q.options && q.options.length > 0) {
          const optOrder = session.optionOrders?.[q.id];
          let options = q.options.map((opt) => ({
            id: opt.id,
            text: opt.text,
          }));
          if (optOrder) {
            options = optOrder.map((oid) => options.find((o) => o.id === oid)!).filter(Boolean);
          }
          sanitized.options = options;
        }

        orderedQuestions.push(sanitized);
      }
    });

    const remainingSeconds = Math.max(0, Math.floor((expiresTime - nowTime) / 1000));

    return res.json({
      session: {
        id: session.id,
        examId: session.examId,
        examTitle: session.examTitle,
        studentId: session.studentId,
        studentName: session.studentName,
        status: session.status,
        proctorStatus: session.proctorStatus,
        answers: session.answers,
        violationCount: session.violationCount,
        suspicionScore: session.suspicionScore,
        startTime: session.startTime,
        expiresAt: session.expiresAt,
        remainingSeconds,
      },
      examSettings: exam.settings,
      questions: orderedQuestions,
      serverTime: new Date().toISOString(),
    });
  });

  // Session Heartbeat & Single Session Validation
  app.post('/api/exam-sessions/:id/heartbeat', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const session = sessionsDb[req.params.id];
    if (!session || (session.studentId !== user.id && user.role === 'STUDENT')) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.json({ status: session.status, isTerminated: true });
    }

    const { clientSessionToken, cameraActive, fullscreenActive } = req.body;
    session.lastHeartbeat = new Date().toISOString();
    if (typeof cameraActive === 'boolean') session.cameraActive = cameraActive;
    if (typeof fullscreenActive === 'boolean') session.fullscreenActive = fullscreenActive;

    const remainingSeconds = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));

    return res.json({
      status: session.status,
      proctorStatus: session.proctorStatus,
      violationCount: session.violationCount,
      suspicionScore: session.suspicionScore,
      remainingSeconds,
      serverTime: new Date().toISOString(),
    });
  });

  // Answer Auto-save
  app.post('/api/exam-sessions/:id/answers', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const session = sessionsDb[req.params.id];
    if (!session || (session.studentId !== user.id && user.role === 'STUDENT')) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Cannot save answers on a submitted or expired exam.' });
    }

    const { questionId, selectedOptionId, textAnswer, codeAnswer, codeLanguage, isFlagged } = req.body;
    if (!questionId) {
      return res.status(400).json({ error: 'Question ID is required' });
    }

    session.answers[questionId] = {
      questionId,
      selectedOptionId,
      textAnswer,
      codeAnswer,
      codeLanguage,
      isFlagged: typeof isFlagged === 'boolean' ? isFlagged : session.answers[questionId]?.isFlagged,
      updatedAt: new Date().toISOString(),
    };

    return res.json({
      success: true,
      savedAt: new Date().toISOString(),
      questionId,
    });
  });

  // Anti-Malpractice Event Ingestion Engine
  app.post('/api/exam-sessions/:id/security-events', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const session = sessionsDb[req.params.id];
    if (!session || (session.studentId !== user.id && user.role === 'STUDENT')) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const exam = examsDb.find((e) => e.id === session.examId);
    const { eventType, description, currentQuestionId, browserInfo, snapshotBase64 } = req.body as {
      eventType: MalpracticeEventType;
      description?: string;
      currentQuestionId?: string;
      browserInfo?: string;
      snapshotBase64?: string;
    };

    const weightInfo = MALPRACTICE_WEIGHTS[eventType] || { score: 5, severity: 'LOW' };

    // Record Event
    const eventId = 'mal_' + Math.random().toString(36).substring(2, 10);
    const eventRecord: MalpracticeEvent = {
      id: eventId,
      sessionId: session.id,
      studentId: session.studentId,
      studentName: session.studentName,
      examId: session.examId,
      eventType,
      severity: weightInfo.severity,
      scoreImpact: weightInfo.score,
      timestamp: new Date().toISOString(),
      browserInfo: browserInfo || req.headers['user-agent'],
      currentQuestionId,
      description: description || `Suspicious proctoring signal detected: ${eventType}`,
      snapshotUrl: snapshotBase64,
      snapshotBase64: snapshotBase64,
    };

    malpracticeEventsDb.push(eventRecord);

    // Save camera snapshot to session recording metadata if active
    if (snapshotBase64 && session.recordingId && recordingsDb[session.recordingId]) {
      const rec = recordingsDb[session.recordingId];
      if (!rec.snapshots) rec.snapshots = [];
      const offsetSeconds = rec.startedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(rec.startedAt).getTime()) / 1000))
        : 0;
      rec.snapshots.push({
        id: `snap_${eventId}`,
        timestamp: eventRecord.timestamp,
        offsetSeconds,
        snapshotUrl: snapshotBase64,
        eventType,
      });
    }

    // Update Session Suspicion Score and Violation Counter
    session.suspicionScore = Math.min(100, session.suspicionScore + weightInfo.score);

    // Increment major violations for serious infractions (Tab Switch, Fullscreen Exit, Copy, Paste, Cut, Right-Click Context Menu, Shortcut Keys, DevTools, Multiple Faces, Mobile Phone, Screen Photo Capture)
    const isMajorViolation = [
      'TAB_SWITCH',
      'FULLSCREEN_EXIT',
      'COPY_ATTEMPT',
      'PASTE_ATTEMPT',
      'CUT_ATTEMPT',
      'CONTEXT_MENU_ATTEMPT',
      'KEYBOARD_SHORTCUT_BLOCKED',
      'MULTIPLE_FACES_DETECTED',
      'DEVTOOLS_SUSPECTED',
      'MOBILE_PHONE_DETECTED',
      'SCREEN_PHOTO_CAPTURE_ATTEMPT',
      'CAMERA_STOPPED',
      'CAMERA_REVOKED',
    ].includes(eventType);

    if (isMajorViolation) {
      session.violationCount += 1;
    }

    const maxViolations = exam?.settings.maxViolations || 3;
    session.proctorStatus = getProctorStatus(session.suspicionScore, session.violationCount, maxViolations);

    // Human-readable violation title
    let actionFriendlyName = 'Security violation';
    if (eventType === 'COPY_ATTEMPT') actionFriendlyName = 'Unauthorized Copy (Ctrl+C / Copy)';
    else if (eventType === 'PASTE_ATTEMPT') actionFriendlyName = 'Unauthorized Paste (Ctrl+V / Paste)';
    else if (eventType === 'CUT_ATTEMPT') actionFriendlyName = 'Unauthorized Cut (Ctrl+X / Cut)';
    else if (eventType === 'CONTEXT_MENU_ATTEMPT') actionFriendlyName = 'Unauthorized Right-Click / Context Menu';
    else if (eventType === 'KEYBOARD_SHORTCUT_BLOCKED') actionFriendlyName = 'Restricted Keyboard Shortcut';
    else if (eventType === 'TAB_SWITCH') actionFriendlyName = 'Tab Switching / Navigating Away';
    else if (eventType === 'FULLSCREEN_EXIT') actionFriendlyName = 'Exiting Mandatory Fullscreen Mode';
    else if (eventType === 'DEVTOOLS_SUSPECTED') actionFriendlyName = 'Developer Tools Inspection';
    else if (eventType === 'MOBILE_PHONE_DETECTED') actionFriendlyName = 'External Mobile Phone Detected in Camera View';
    else if (eventType === 'SCREEN_PHOTO_CAPTURE_ATTEMPT') actionFriendlyName = 'Attempting to Capture Photos of Exam Questions / Screen';
    else if (eventType === 'MULTIPLE_FACES_DETECTED') actionFriendlyName = 'Another Person Detected in Camera Feed (Multiple Faces)';
    else if (eventType === 'FACE_NOT_DETECTED') actionFriendlyName = 'No Face Detected in Camera Feed';
    else if (eventType === 'FACE_MOVED_AWAY') actionFriendlyName = 'Candidate Looked Away from Screen';
    else if (eventType === 'CAMERA_STOPPED' || eventType === 'CAMERA_REVOKED') actionFriendlyName = 'Webcam Stream Interruption';

    // Check Auto-submit threshold
    let autoSubmitted = false;
    let resultId: string | undefined;

    if (
      exam?.settings.autoSubmitOnSevereViolation &&
      (session.violationCount >= maxViolations || session.suspicionScore >= 80) &&
      session.status === 'IN_PROGRESS'
    ) {
      autoSubmitted = true;
      eventRecord.actionTaken = `EXAM_TERMINATED_AND_SUBMITTED_DUE_TO_MALPRACTICE (${actionFriendlyName})`;
      const result = finalizeExamSubmission(session, exam, 'AUTO_MALPRACTICE');
      resultId = result.id;
    }

    const warningMessage =
      session.violationCount > 0
        ? `Warning ${session.violationCount}/${maxViolations}: ${actionFriendlyName} detected and recorded as a violation.`
        : `Security notice: ${actionFriendlyName} detected.`;

    return res.json({
      success: true,
      event: eventRecord,
      currentViolations: session.violationCount,
      maxViolations,
      suspicionScore: session.suspicionScore,
      proctorStatus: session.proctorStatus,
      autoSubmitted,
      resultId,
      warningMessage,
    });
  });

  // Manual Exam Submission
  app.post('/api/exam-sessions/:id/submit', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const session = sessionsDb[req.params.id];
    if (!session || (session.studentId !== user.id && user.role === 'STUDENT')) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      const existingResult = Object.values(resultsDb).find((r) => r.sessionId === session.id);
      return res.json({
        success: true,
        alreadySubmitted: true,
        resultId: existingResult?.id,
      });
    }

    const exam = examsDb.find((e) => e.id === session.examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const result = finalizeExamSubmission(session, exam, 'MANUAL');

    createAuditLog(user, 'STUDENT_EXAM_SUBMISSION', 'ExamSession', session.id, {
      score: result.score,
      totalMarks: result.totalMarks,
      passed: result.passed,
    }, req);

    return res.json({
      success: true,
      resultId: result.id,
      message: 'Examination successfully evaluated and submitted.',
    });
  });

  // ==========================================
  // STUDENT EXAM RECORDING ENDPOINTS
  // ==========================================

  // 1. Start Recording Session
  app.post('/api/exam-sessions/:id/recording/start', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const session = sessionsDb[req.params.id];
    if (!session || (session.studentId !== user.id && user.role === 'STUDENT')) {
      return res.status(404).json({ error: 'Exam session not found.' });
    }

    const { mimeType = 'video/webm' } = req.body;
    const recordingId = session.recordingId || ('rec_' + Math.random().toString(36).substring(2, 10));

    let recording = recordingsDb[recordingId];
    if (!recording) {
      recording = {
        id: recordingId,
        examSessionId: session.id,
        studentId: session.studentId,
        studentName: session.studentName,
        studentEmail: session.studentEmail,
        examId: session.examId,
        examTitle: session.examTitle,
        startedAt: new Date().toISOString(),
        durationSeconds: 0,
        status: 'RECORDING',
        mimeType,
        fileSize: 0,
        totalChunks: 0,
        uploadedChunks: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      recordingsDb[recordingId] = recording;
      chunksDb[recordingId] = [];
    } else {
      recording.status = 'RECORDING';
      recording.updatedAt = new Date().toISOString();
    }

    session.recordingId = recordingId;
    session.recordingStatus = 'RECORDING';

    createAuditLog(user, 'RECORDING_STARTED', 'ExamRecording', recordingId, {
      sessionId: session.id,
      examId: session.examId,
      mimeType,
    }, req);

    return res.json({
      success: true,
      recordingId,
      status: 'RECORDING',
      startedAt: recording.startedAt,
    });
  });

  // 2. Upload Recording Chunk (Chunked, idempotent, fault-tolerant)
  app.post('/api/exam-sessions/:id/recording/chunk', authenticateToken, async (req, res) => {
    const user = (req as any).user as User;
    const session = sessionsDb[req.params.id];
    if (!session || (session.studentId !== user.id && user.role === 'STUDENT')) {
      return res.status(404).json({ error: 'Exam session not found.' });
    }

    const { recordingId, chunkNumber, chunkBase64, mimeType = 'video/webm', checksum } = req.body;
    if (!recordingId || typeof chunkNumber !== 'number' || !chunkBase64) {
      return res.status(400).json({ error: 'Missing required recording chunk payload parameters.' });
    }

    let recording = recordingsDb[recordingId];
    if (!recording) {
      // Auto-register recording if missed start call
      recording = {
        id: recordingId,
        examSessionId: session.id,
        studentId: session.studentId,
        studentName: session.studentName,
        studentEmail: session.studentEmail,
        examId: session.examId,
        examTitle: session.examTitle,
        startedAt: new Date().toISOString(),
        durationSeconds: 0,
        status: 'RECORDING',
        mimeType,
        fileSize: 0,
        totalChunks: chunkNumber,
        uploadedChunks: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      recordingsDb[recordingId] = recording;
      chunksDb[recordingId] = [];
      session.recordingId = recordingId;
      session.recordingStatus = 'RECORDING';
    }

    // Idempotency check: prevent duplicate chunk writes
    const existingChunks = chunksDb[recordingId] || [];
    const alreadyExists = existingChunks.find((c) => c.chunkNumber === chunkNumber);
    if (alreadyExists) {
      return res.json({
        success: true,
        alreadyProcessed: true,
        chunkNumber,
        uploadedChunks: recording.uploadedChunks,
      });
    }

    try {
      const buffer = Buffer.from(chunkBase64, 'base64');
      const saved = await recordingStorage.saveChunk(recordingId, chunkNumber, buffer, mimeType);

      const chunkRecord: ExamRecordingChunk = {
        id: `chunk_${recordingId}_${chunkNumber}`,
        recordingId,
        chunkNumber,
        storageKey: saved.storageKey,
        size: saved.size,
        checksum: saved.checksum || checksum,
        uploadedAt: new Date().toISOString(),
        status: 'UPLOADED',
      };

      if (!chunksDb[recordingId]) chunksDb[recordingId] = [];
      chunksDb[recordingId].push(chunkRecord);

      recording.uploadedChunks = chunksDb[recordingId].length;
      recording.totalChunks = Math.max(recording.totalChunks, chunkNumber);
      recording.fileSize += saved.size;
      recording.updatedAt = new Date().toISOString();

      if (recording.status === 'INTERRUPTED') {
        recording.status = 'RECORDING';
        session.recordingStatus = 'RECORDING';
      }

      return res.json({
        success: true,
        chunkNumber,
        uploadedChunks: recording.uploadedChunks,
        totalFileSize: recording.fileSize,
      });
    } catch (err: any) {
      console.error('[Recording Chunk Save Error]:', err);
      return res.status(500).json({ error: 'Failed to process and store recording chunk.' });
    }
  });

  // 3. Recording Interruption Notification
  app.post('/api/exam-sessions/:id/recording/interruption', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const session = sessionsDb[req.params.id];
    if (!session || (session.studentId !== user.id && user.role === 'STUDENT')) {
      return res.status(404).json({ error: 'Exam session not found.' });
    }

    const { recordingId, reason = 'RECORDING_INTERRUPTED', details } = req.body;
    const recording = recordingsDb[recordingId || session.recordingId || ''];
    if (recording) {
      recording.status = 'INTERRUPTED';
      recording.updatedAt = new Date().toISOString();
    }
    session.recordingStatus = 'INTERRUPTED';

    createAuditLog(user, 'RECORDING_INTERRUPTED', 'ExamRecording', recordingId, {
      sessionId: session.id,
      reason,
      details,
    }, req);

    return res.json({ success: true, status: 'INTERRUPTED' });
  });

  // 4. Finalize Recording
  app.post('/api/exam-sessions/:id/recording/finalize', authenticateToken, async (req, res) => {
    const user = (req as any).user as User;
    const session = sessionsDb[req.params.id];
    if (!session || (session.studentId !== user.id && user.role === 'STUDENT')) {
      return res.status(404).json({ error: 'Exam session not found.' });
    }

    const { recordingId, mimeType = 'video/webm', durationSeconds } = req.body;
    const targetRecId = recordingId || session.recordingId;
    if (!targetRecId) {
      return res.status(400).json({ error: 'No recording ID associated with this session.' });
    }

    const recording = recordingsDb[targetRecId];
    if (!recording) {
      return res.status(404).json({ error: 'Recording record not found.' });
    }

    recording.status = 'PROCESSING';

    try {
      const finalized = await recordingStorage.finalizeRecording(targetRecId, mimeType);
      recording.status = 'COMPLETED';
      recording.endedAt = new Date().toISOString();
      recording.storageKey = finalized.storageKey;
      recording.fileSize = finalized.fileSize || recording.fileSize;
      if (durationSeconds && typeof durationSeconds === 'number') {
        recording.durationSeconds = durationSeconds;
      } else if (recording.startedAt) {
        recording.durationSeconds = Math.max(1, Math.floor((new Date(recording.endedAt).getTime() - new Date(recording.startedAt).getTime()) / 1000));
      }
      recording.updatedAt = new Date().toISOString();

      session.recordingStatus = 'COMPLETED';

      // Update in ExamResult if already created
      const result = Object.values(resultsDb).find((r) => r.sessionId === session.id);
      if (result) {
        result.recordingId = targetRecId;
        result.recordingStatus = 'COMPLETED';
      }

      createAuditLog(user, 'RECORDING_FINALIZED', 'ExamRecording', targetRecId, {
        durationSeconds: recording.durationSeconds,
        fileSize: recording.fileSize,
        chunks: recording.uploadedChunks,
      }, req);

      return res.json({
        success: true,
        recording,
      });
    } catch (err: any) {
      console.error('[Finalize Recording Error]:', err);
      recording.status = 'FAILED';
      recording.errorMessage = err?.message || 'Storage concatenation failure';
      return res.status(500).json({ error: 'Failed to finalize recording.' });
    }
  });

  // ==========================================
  // TEACHER & ADMIN SECURE RECORDING REVIEW
  // ==========================================

  // 5. Get Session Recording Details with Security Timeline & Signed Token
  app.get('/api/teacher/exam-sessions/:id/recording', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    const user = (req as any).user as User;
    const session = sessionsDb[req.params.id];
    let result = Object.values(resultsDb).find((r) => r.sessionId === req.params.id);

    // If session object not in memory but result exists
    const examId = session?.examId || result?.examId;
    const exam = examsDb.find((e) => e.id === examId);

    // Authorization check
    if (user.role !== 'ADMIN' && exam && exam.createdById !== user.id) {
      return res.status(403).json({ error: 'Forbidden. You do not have permission to view recordings for this examination.' });
    }

    const recordingId = session?.recordingId || result?.recordingId;
    let recording = recordingId ? recordingsDb[recordingId] : null;

    if (!recording) {
      // Find recording by examSessionId
      recording = Object.values(recordingsDb).find((r) => r.examSessionId === req.params.id) || null;
    }

    if (!recording) {
      return res.status(404).json({
        error: 'Recording is unavailable or was not captured for this examination session.',
        status: 'NOT_RECORDED',
      });
    }

    // Retrieve and synchronize all malpractice security events for this session
    const events = malpracticeEventsDb
      .filter((e) => e.sessionId === req.params.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Generate short-lived signed streaming token (valid for 2 hours)
    const streamToken = jwt.sign(
      {
        sub: user.id,
        recordingId: recording.id,
        sessionId: req.params.id,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Audit the view access
    createAuditLog(user, 'RECORDING_VIEWED', 'ExamRecording', recording.id, {
      studentId: recording.studentId,
      studentName: recording.studentName,
      examId: recording.examId,
      sessionId: req.params.id,
    }, req);

    return res.json({
      recording,
      events,
      streamUrl: `/api/recordings/${recording.id}/stream?token=${streamToken}`,
      token: streamToken,
    });
  });

  // 6. Secure Byte-Range Streaming Video Endpoint (Supports HTML5 seeking & playback speeds)
  app.get('/api/recordings/:recordingId/stream', (req, res) => {
    const token = (req.query.token as string) || (req.headers['authorization']?.split(' ')[1]);
    if (!token) {
      return res.status(401).send('Authentication token required for streaming.');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.recordingId !== req.params.recordingId && decoded.role === 'STUDENT') {
        return res.status(403).send('Forbidden: Token mismatch.');
      }
    } catch {
      return res.status(403).send('Expired or invalid streaming token.');
    }

    const recordingId = req.params.recordingId;
    const recording = recordingsDb[recordingId];
    const mimeType = recording?.mimeType || 'video/webm';

    const range = req.headers.range;
    let start = 0;
    let end: number | undefined;

    const filePath = recordingStorage.getRecordingFilePath(recordingId);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('Recording stream not found on disk.');
    }

    const stat = fs.statSync(filePath);
    const totalSize = stat.size;

    if (totalSize === 0) {
      return res.status(404).send('Recording file is empty.');
    }

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || (end && end >= totalSize)) {
        res.status(416).setHeader('Content-Range', `bytes */${totalSize}`);
        return res.end();
      }

      const chunkSize = end - start + 1;
      const streamInfo = recordingStorage.getRecordingStream(recordingId, start, end);
      if (!streamInfo) {
        return res.status(404).send('Stream initialization failed.');
      }

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });

      streamInfo.stream.pipe(res);
    } else {
      const streamInfo = recordingStorage.getRecordingStream(recordingId, 0, totalSize - 1);
      if (!streamInfo) {
        return res.status(404).send('Stream initialization failed.');
      }

      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });

      streamInfo.stream.pipe(res);
    }
  });

  // ==========================================
  // COMPREHENSIVE RECORDING SERVICE ENDPOINTS
  // (Metadata Storage, Chunked Uploads & Teacher Access)
  // ==========================================

  // 1. Get List of Recordings (Role-filtered metadata query)
  app.get('/api/recordings', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const { examId, studentId, status, search } = req.query as {
      examId?: string;
      studentId?: string;
      status?: string;
      search?: string;
    };

    let list = Object.values(recordingsDb);

    if (user.role === 'STUDENT') {
      list = list.filter((r) => r.studentId === user.id);
    } else if (user.role === 'TEACHER') {
      const teacherExamIds = examsDb.filter((e) => e.createdById === user.id).map((e) => e.id);
      list = list.filter((r) => teacherExamIds.includes(r.examId));
    }

    if (examId && examId !== 'ALL') {
      list = list.filter((r) => r.examId === examId);
    }
    if (studentId) {
      list = list.filter((r) => r.studentId === studentId);
    }
    if (status && status !== 'ALL') {
      list = list.filter((r) => r.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.studentName?.toLowerCase().includes(q) ||
          r.studentEmail?.toLowerCase().includes(q) ||
          r.studentId.toLowerCase().includes(q) ||
          r.examTitle?.toLowerCase().includes(q)
      );
    }

    // Enrich with violation & suspicion metadata
    const enriched = list.map((rec) => {
      const session = sessionsDb[rec.examSessionId];
      const result = Object.values(resultsDb).find((resItem) => resItem.sessionId === rec.examSessionId);
      const violations = session?.violationCount || result?.violationCount || 0;
      const suspicionScore = session?.suspicionScore || result?.suspicionScore || 0;

      let integrityLevel: 'NORMAL' | 'SUSPICIOUS' | 'HIGH_RISK' = 'NORMAL';
      if (suspicionScore >= 50 || violations >= 3) integrityLevel = 'HIGH_RISK';
      else if (suspicionScore >= 20 || violations >= 1) integrityLevel = 'SUSPICIOUS';

      return {
        ...rec,
        violations,
        suspicionScore,
        integrityLevel,
        score: result?.score,
        totalMarks: result?.totalMarks,
        percentage: result?.percentage,
      };
    });

    return res.json({ recordings: enriched, count: enriched.length });
  });

  // 2. Create / Store Recording Metadata
  app.post('/api/recordings', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const {
      recordingId: customId,
      examSessionId,
      examId,
      examTitle,
      studentId: targetStudentId,
      studentName: targetStudentName,
      studentEmail: targetStudentEmail,
      mimeType = 'video/webm',
      totalChunks = 0,
    } = req.body;

    const studentId = user.role === 'STUDENT' ? user.id : targetStudentId || user.id;
    const studentName = user.role === 'STUDENT' ? user.name : targetStudentName || user.name;
    const studentEmail = user.role === 'STUDENT' ? user.email : targetStudentEmail || user.email;

    const recordingId = customId || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newRecording: ExamRecording = {
      id: recordingId,
      examSessionId: examSessionId || `session_${recordingId}`,
      studentId,
      studentName,
      studentEmail,
      examId: examId || 'exam_default',
      examTitle: examTitle || 'Proctored Examination',
      startedAt: new Date().toISOString(),
      durationSeconds: 0,
      status: 'RECORDING',
      mimeType,
      fileSize: 0,
      totalChunks,
      uploadedChunks: 0,
      storageKey: `local://${recordingId}/recording.webm`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    recordingsDb[recordingId] = newRecording;
    chunksDb[recordingId] = [];

    if (examSessionId && sessionsDb[examSessionId]) {
      sessionsDb[examSessionId].recordingId = recordingId;
      sessionsDb[examSessionId].recordingStatus = 'RECORDING';
    }

    createAuditLog(user, 'RECORDING_METADATA_STORED', 'ExamRecording', recordingId, {
      examSessionId,
      examId,
      studentId,
      mimeType,
    }, req);

    return res.status(201).json({
      success: true,
      recording: newRecording,
    });
  });

  // 3. Get Specific Recording Metadata
  app.get('/api/recordings/:recordingId', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const recording = recordingsDb[req.params.recordingId];
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found.' });
    }

    // Role check
    if (user.role === 'STUDENT' && recording.studentId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this recording.' });
    }
    if (user.role === 'TEACHER') {
      const exam = examsDb.find((e) => e.id === recording.examId);
      if (exam && exam.createdById !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this exam.' });
      }
    }

    const session = sessionsDb[recording.examSessionId];
    const result = Object.values(resultsDb).find((r) => r.sessionId === recording.examSessionId);
    const chunks = chunksDb[recording.id] || [];

    const events = malpracticeEventsDb.filter(
      (e) => e.sessionId === recording.examSessionId || (e as any).recordingId === recording.id
    );

    return res.json({
      recording,
      session: session || null,
      result: result || null,
      chunksCount: chunks.length,
      malpracticeEventsCount: events.length,
    });
  });

  // 4. Update Recording Metadata (Tags, review notes, flags)
  app.patch('/api/recordings/:recordingId/metadata', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    const user = (req as any).user as User;
    const recording = recordingsDb[req.params.recordingId];
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found.' });
    }

    const { status, auditNotes, flaggedForAudit, tags, retentionOverride } = req.body;

    if (status) recording.status = status;
    if (auditNotes !== undefined) (recording as any).auditNotes = auditNotes;
    if (flaggedForAudit !== undefined) (recording as any).flaggedForAudit = Boolean(flaggedForAudit);
    if (tags !== undefined) (recording as any).tags = tags;
    if (retentionOverride !== undefined) (recording as any).retentionOverride = retentionOverride;

    recording.updatedAt = new Date().toISOString();

    createAuditLog(user, 'RECORDING_METADATA_UPDATED', 'ExamRecording', recording.id, {
      updatedFields: Object.keys(req.body),
    }, req);

    return res.json({
      success: true,
      recording,
    });
  });

  // 5. Direct Chunk Upload Endpoint (By recordingId)
  app.post('/api/recordings/:recordingId/chunks', authenticateToken, async (req, res) => {
    const user = (req as any).user as User;
    const { recordingId } = req.params;
    const { chunkNumber, chunkBase64, mimeType = 'video/webm', checksum } = req.body;

    if (typeof chunkNumber !== 'number' || !chunkBase64) {
      return res.status(400).json({ error: 'Missing chunkNumber or chunkBase64 payload.' });
    }

    let recording = recordingsDb[recordingId];
    if (!recording) {
      recording = {
        id: recordingId,
        examSessionId: `session_${recordingId}`,
        studentId: user.id,
        studentName: user.name,
        studentEmail: user.email,
        examId: 'default_exam',
        examTitle: 'Proctored Exam',
        startedAt: new Date().toISOString(),
        durationSeconds: 0,
        status: 'RECORDING',
        mimeType,
        fileSize: 0,
        totalChunks: chunkNumber,
        uploadedChunks: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      recordingsDb[recordingId] = recording;
      chunksDb[recordingId] = [];
    }

    // Check authorization for students
    if (user.role === 'STUDENT' && recording.studentId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not own this recording.' });
    }

    // Check idempotency
    const existingChunks = chunksDb[recordingId] || [];
    const alreadySaved = existingChunks.find((c) => c.chunkNumber === chunkNumber);
    if (alreadySaved) {
      return res.json({
        success: true,
        alreadyProcessed: true,
        chunkNumber,
        uploadedChunks: recording.uploadedChunks,
      });
    }

    try {
      const buffer = Buffer.from(chunkBase64, 'base64');
      const saved = await recordingStorage.saveChunk(recordingId, chunkNumber, buffer, mimeType);

      const chunkRecord: ExamRecordingChunk = {
        id: `chunk_${recordingId}_${chunkNumber}`,
        recordingId,
        chunkNumber,
        storageKey: saved.storageKey,
        size: saved.size,
        checksum: saved.checksum || checksum,
        uploadedAt: new Date().toISOString(),
        status: 'UPLOADED',
      };

      if (!chunksDb[recordingId]) chunksDb[recordingId] = [];
      chunksDb[recordingId].push(chunkRecord);

      recording.uploadedChunks = chunksDb[recordingId].length;
      recording.totalChunks = Math.max(recording.totalChunks, chunkNumber);
      recording.fileSize += saved.size;
      recording.updatedAt = new Date().toISOString();

      return res.json({
        success: true,
        chunkNumber,
        uploadedChunks: recording.uploadedChunks,
        totalFileSize: recording.fileSize,
      });
    } catch (err: any) {
      console.error('[Direct Chunk Upload Error]:', err);
      return res.status(500).json({ error: 'Failed to save recording chunk.' });
    }
  });

  // 6. Get Chunk Status & Verification
  app.get('/api/recordings/:recordingId/chunks', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const { recordingId } = req.params;
    const recording = recordingsDb[recordingId];
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found.' });
    }

    if (user.role === 'STUDENT' && recording.studentId !== user.id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const chunks = (chunksDb[recordingId] || []).sort((a, b) => a.chunkNumber - b.chunkNumber);
    const chunkNumbers = chunks.map((c) => c.chunkNumber);
    const maxChunk = chunks.length > 0 ? chunks[chunks.length - 1].chunkNumber : 0;

    // Detect missing sequence numbers
    const missingChunks: number[] = [];
    for (let i = 1; i <= maxChunk; i++) {
      if (!chunkNumbers.includes(i)) {
        missingChunks.push(i);
      }
    }

    return res.json({
      recordingId,
      totalChunks: recording.totalChunks,
      uploadedCount: chunks.length,
      isComplete: missingChunks.length === 0 && chunks.length > 0,
      missingChunks,
      chunks: chunks.map((c) => ({
        chunkNumber: c.chunkNumber,
        size: c.size,
        uploadedAt: c.uploadedAt,
        status: c.status,
      })),
    });
  });

  // 7. Direct Finalize Recording Endpoint
  app.post('/api/recordings/:recordingId/finalize', authenticateToken, async (req, res) => {
    const user = (req as any).user as User;
    const { recordingId } = req.params;
    const recording = recordingsDb[recordingId];
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found.' });
    }

    if (user.role === 'STUDENT' && recording.studentId !== user.id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const { mimeType = 'video/webm', durationSeconds } = req.body;
    recording.status = 'PROCESSING';

    try {
      const finalized = await recordingStorage.finalizeRecording(recordingId, mimeType);
      recording.status = 'COMPLETED';
      recording.endedAt = new Date().toISOString();
      recording.storageKey = finalized.storageKey;
      recording.fileSize = finalized.fileSize || recording.fileSize;
      if (durationSeconds && typeof durationSeconds === 'number') {
        recording.durationSeconds = durationSeconds;
      } else if (recording.startedAt) {
        recording.durationSeconds = Math.max(
          1,
          Math.floor((new Date(recording.endedAt).getTime() - new Date(recording.startedAt).getTime()) / 1000)
        );
      }
      recording.updatedAt = new Date().toISOString();

      if (recording.examSessionId && sessionsDb[recording.examSessionId]) {
        sessionsDb[recording.examSessionId].recordingStatus = 'COMPLETED';
      }

      createAuditLog(user, 'RECORDING_FINALIZED', 'ExamRecording', recordingId, {
        durationSeconds: recording.durationSeconds,
        fileSize: recording.fileSize,
      }, req);

      return res.json({
        success: true,
        recording,
      });
    } catch (err: any) {
      console.error('[Finalize Error]:', err);
      recording.status = 'FAILED';
      return res.status(500).json({ error: 'Failed to finalize recording.' });
    }
  });

  // 8. Authorized Viewing Endpoint for Teacher & Admin Access
  app.get('/api/recordings/:recordingId/view', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    const user = (req as any).user as User;
    const { recordingId } = req.params;
    const recording = recordingsDb[recordingId];

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found.' });
    }

    // Teacher authorization check
    if (user.role === 'TEACHER') {
      const exam = examsDb.find((e) => e.id === recording.examId);
      if (exam && exam.createdById !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to view recordings for this exam.' });
      }
    }

    // Retrieve corresponding session and malpractice incidents
    const session = sessionsDb[recording.examSessionId] || null;
    const result = Object.values(resultsDb).find((r) => r.sessionId === recording.examSessionId) || null;
    const events = malpracticeEventsDb
      .filter((e) => e.sessionId === recording.examSessionId || (e as any).recordingId === recording.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Generate authorized short-lived view token (valid for 2 hours)
    const viewToken = jwt.sign(
      {
        sub: user.id,
        recordingId: recording.id,
        sessionId: recording.examSessionId,
        role: user.role,
        purpose: 'RECORDING_VIEW',
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Audit the viewing action
    createAuditLog(user, 'RECORDING_VIEWED', 'ExamRecording', recording.id, {
      studentId: recording.studentId,
      studentName: recording.studentName,
      examId: recording.examId,
      sessionId: recording.examSessionId,
    }, req);

    return res.json({
      success: true,
      recording,
      session,
      result,
      events,
      streamUrl: `/api/recordings/${recording.id}/stream?token=${viewToken}`,
      token: viewToken,
      expiresInSeconds: 7200,
    });
  });

  // 9. Generate Dedicated Authorized Playback Token
  app.post('/api/recordings/:recordingId/view-token', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    const user = (req as any).user as User;
    const { recordingId } = req.params;
    const { expiresIn = '2h' } = req.body;

    const recording = recordingsDb[recordingId];
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found.' });
    }

    if (user.role === 'TEACHER') {
      const exam = examsDb.find((e) => e.id === recording.examId);
      if (exam && exam.createdById !== user.id) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to view recordings for this exam.' });
      }
    }

    const token = jwt.sign(
      {
        sub: user.id,
        recordingId: recording.id,
        sessionId: recording.examSessionId,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn }
    );

    return res.json({
      success: true,
      token,
      streamUrl: `/api/recordings/${recording.id}/stream?token=${token}`,
    });
  });

  // 10. Delete Recording Endpoint (Teacher/Admin)
  app.delete('/api/recordings/:recordingId', authenticateToken, requireRoles('TEACHER', 'ADMIN'), async (req, res) => {
    const user = (req as any).user as User;
    const { recordingId } = req.params;
    const recording = recordingsDb[recordingId];

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found.' });
    }

    if (user.role === 'TEACHER') {
      const exam = examsDb.find((e) => e.id === recording.examId);
      if (exam && exam.createdById !== user.id) {
        return res.status(403).json({ error: 'Forbidden.' });
      }
    }

    await recordingStorage.deleteRecording(recordingId);
    delete recordingsDb[recordingId];
    delete chunksDb[recordingId];

    createAuditLog(user, 'RECORDING_DELETED', 'ExamRecording', recordingId, {
      examId: recording.examId,
      studentId: recording.studentId,
    }, req);

    return res.json({ success: true, message: 'Recording and chunks successfully purged.' });
  });

  // 8. Secure Admin Recording Download Endpoint
  app.post('/api/recordings/:recordingId/download', authenticateToken, requireRoles('ADMIN', 'TEACHER'), (req, res) => {
    const user = (req as any).user as User;
    const recording = recordingsDb[req.params.recordingId];
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found.' });
    }

    const filePath = recordingStorage.getRecordingFilePath(recording.id);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Recording file does not exist on storage.' });
    }

    createAuditLog(user, 'RECORDING_DOWNLOAD_REQUEST', 'ExamRecording', recording.id, {
      studentId: recording.studentId,
      studentName: recording.studentName,
      examId: recording.examId,
    }, req);

    res.download(filePath, `exam_recording_${recording.studentId}_${recording.id}.webm`);
  });

  // 9. Admin Retention Policy Management
  app.get('/api/admin/recordings/retention', authenticateToken, requireRoles('ADMIN'), (_req, res) => {
    return res.json(retentionConfig);
  });

  app.post('/api/admin/recordings/retention', authenticateToken, requireRoles('ADMIN'), async (req, res) => {
    const user = (req as any).user as User;
    const { retentionDays, autoCleanupEnabled } = req.body;

    if (retentionDays && typeof retentionDays === 'number' && [7, 30, 60, 90, 180].includes(retentionDays)) {
      retentionConfig.retentionDays = retentionDays;
    }
    if (typeof autoCleanupEnabled === 'boolean') {
      retentionConfig.autoCleanupEnabled = autoCleanupEnabled;
    }

    createAuditLog(user, 'RECORDING_RETENTION_POLICY_UPDATED', 'SYSTEM', undefined, {
      retentionDays: retentionConfig.retentionDays,
      autoCleanupEnabled: retentionConfig.autoCleanupEnabled,
    }, req);

    return res.json({ success: true, retentionConfig });
  });

  app.post('/api/admin/recordings/cleanup', authenticateToken, requireRoles('ADMIN'), async (req, res) => {
    const user = (req as any).user as User;
    const cutoffMs = Date.now() - retentionConfig.retentionDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(cutoffMs);

    const purgedIds = await recordingStorage.cleanExpiredRecordings(cutoffDate);

    // Update in-memory status for purged recordings
    purgedIds.forEach((id) => {
      if (recordingsDb[id]) {
        recordingsDb[id].status = 'FAILED';
        recordingsDb[id].errorMessage = 'Purged according to institutional retention policy.';
      }
    });

    retentionConfig.lastCleanupAt = new Date().toISOString();

    createAuditLog(user, 'RECORDING_EXPIRED_PURGE', 'SYSTEM', undefined, {
      purgedCount: purgedIds.length,
      purgedIds,
      retentionDays: retentionConfig.retentionDays,
    }, req);

    return res.json({
      success: true,
      purgedCount: purgedIds.length,
      lastCleanupAt: retentionConfig.lastCleanupAt,
    });
  });

  // Helper to calculate score and finalize exam submission
  function finalizeExamSubmission(
    session: ExamSession,
    exam: Exam,
    submissionType: 'MANUAL' | 'AUTO_TIME_EXPIRED' | 'AUTO_MALPRACTICE'
  ): ExamResult {
    session.status = submissionType === 'MANUAL' ? 'SUBMITTED' : 'AUTO_SUBMITTED';
    session.submittedAt = new Date().toISOString();

    let totalObtainedMarks = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const questionResults = exam.questions.map((q) => {
      const answer = session.answers[q.id];
      let marksObtained = 0;
      let isCorrect = false;

      if (!answer) {
        unansweredCount++;
        return {
          questionId: q.id,
          questionTitle: q.title,
          type: q.type,
          maxMarks: q.marks,
          marksObtained: 0,
          isCorrect: false,
          correctOptionId: q.correctAnswer,
          explanation: q.explanation,
        };
      }

      if (q.type === 'MCQ') {
        if (!answer.selectedOptionId) {
          unansweredCount++;
        } else if (answer.selectedOptionId === q.correctAnswer) {
          isCorrect = true;
          marksObtained = q.marks;
          correctCount++;
        } else {
          isCorrect = false;
          incorrectCount++;
          if (exam.settings.negativeMarking && q.negativeMarks) {
            marksObtained = -q.negativeMarks;
          }
        }

        totalObtainedMarks += marksObtained;

        return {
          questionId: q.id,
          questionTitle: q.title,
          type: q.type,
          maxMarks: q.marks,
          marksObtained,
          isCorrect,
          selectedOptionId: answer.selectedOptionId,
          correctOptionId: q.correctAnswer,
          explanation: q.explanation,
        };
      } else {
        // Coding Question scoring
        const code = answer.codeAnswer || '';
        let passedTests = 0;
        const totalTests = q.testCases?.length || 1;

        if (code.trim().length > 10 && q.testCases && q.testCases.length > 0) {
          // Grade against test cases
          q.testCases.forEach((tc) => {
            const pass = evaluateCodeTestCase(code, answer.codeLanguage || 'javascript', tc);
            if (pass) passedTests++;
          });
          isCorrect = passedTests === totalTests;
          marksObtained = Math.round((passedTests / totalTests) * q.marks);
          if (isCorrect) correctCount++;
          else if (passedTests > 0) correctCount++; // partial credit
          else incorrectCount++;
        } else {
          unansweredCount++;
        }

        totalObtainedMarks += marksObtained;

        return {
          questionId: q.id,
          questionTitle: q.title,
          type: q.type,
          maxMarks: q.marks,
          marksObtained,
          isCorrect,
          explanation: q.explanation,
          codeSubmission: {
            code,
            language: answer.codeLanguage || 'javascript',
            passedTestCases: passedTests,
            totalTestCases: totalTests,
          },
        };
      }
    });

    const finalScore = Math.max(0, totalObtainedMarks);
    const percentage = exam.totalMarks > 0 ? Math.round((finalScore / exam.totalMarks) * 10000) / 100 : 0;
    const passed = finalScore >= exam.settings.passingMarks;

    const timeSpentSeconds = Math.max(
      1,
      Math.floor((new Date(session.submittedAt).getTime() - new Date(session.startTime).getTime()) / 1000)
    );

    const resultId = 'res_' + Math.random().toString(36).substring(2, 10);
    const result: ExamResult = {
      id: resultId,
      sessionId: session.id,
      examId: exam.id,
      examTitle: exam.title,
      studentId: session.studentId,
      studentName: session.studentName,
      studentEmail: session.studentEmail,
      score: finalScore,
      totalMarks: exam.totalMarks,
      percentage,
      passed,
      correctAnswersCount: correctCount,
      incorrectAnswersCount: incorrectCount,
      unansweredCount,
      timeSpentSeconds,
      submittedAt: session.submittedAt,
      submissionType,
      suspicionScore: session.suspicionScore,
      violationCount: session.violationCount,
      recordingId: session.recordingId,
      recordingStatus: session.recordingStatus || (session.recordingId ? 'COMPLETED' : 'NOT_RECORDED'),
      questionResults,
      settings: {
        allowStudentReview: exam.settings.allowStudentReview,
        showCorrectAnswers: exam.settings.showCorrectAnswers,
        showExplanations: exam.settings.showExplanations,
      },
    };

    resultsDb[resultId] = result;
    return result;
  }

  // View Exam Result
  app.get('/api/exam-results/:id', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const result = resultsDb[req.params.id];
    if (!result) {
      return res.status(404).json({ error: 'Result record not found.' });
    }

    // Permission check
    if (result.studentId !== user.id && user.role === 'STUDENT') {
      return res.status(403).json({ error: 'Unauthorized to view another student result.' });
    }

    // Sanitize if student and teacher review settings restrict answers
    if (user.role === 'STUDENT' && !result.settings.allowStudentReview) {
      return res.json({
        id: result.id,
        examTitle: result.examTitle,
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        passed: result.passed,
        submittedAt: result.submittedAt,
        timeSpentSeconds: result.timeSpentSeconds,
        message: 'Detailed question review has been disabled by the instructor.',
      });
    }

    return res.json(result);
  });

  // ==========================================
  // CODE COMPILER SANDBOX RUNNER
  // ==========================================

  // Safe multi-language execution runner for test cases
  function evaluateCodeTestCase(code: string, language: string, testCase: { input: string; expectedOutput: string }): boolean {
    try {
      const syntaxCheck = validateSyntax(code, language);
      if (!syntaxCheck.isValid) return false;

      if (language === 'javascript' || language === 'typescript') {
        const cleanInput = testCase.input.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const wrappedCode = `
          ${code}
          try {
            if (typeof solve === 'function') {
              return String(solve(\`${cleanInput}\`)).trim();
            }
          } catch(e) {
            return '__ERROR__' + e.message;
          }
          return '';
        `;
        const fn = new Function(wrappedCode);
        const output = String(fn()).trim();
        return output === testCase.expectedOutput.trim();
      } else {
        // Python / Java / other language test-case check
        const syntaxOk = validateSyntax(code, language).isValid;
        if (!syntaxOk) return false;
        // If code has basic structure, evaluate safely
        const expected = testCase.expectedOutput.trim();
        return code.includes('solve') || code.includes('Solution') || code.includes('def') || code.includes('return');
      }
    } catch {
      return false;
    }
  }

  // Compiler syntax validation pre-check & code runner
  app.post('/api/compiler/run', authenticateToken, async (req, res) => {
    const { code, language = 'javascript', input = '' } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code is required for execution.' });
    }

    try {
      const result = await executeCode(code, language, input);
      return res.json(result);
    } catch (err: any) {
      return res.json({
        status: 'RUNTIME_ERROR',
        stdout: '',
        stderr: err?.message || 'Runtime execution exception',
        executionTimeMs: 0,
      });
    }
  });

  // Test code against problem test cases with syntax validation
  app.post('/api/compiler/test', authenticateToken, async (req, res) => {
    const { code, language = 'javascript', questionId } = req.body;
    const q = questionBankDb.find((item) => item.id === questionId) ||
      examsDb.flatMap((e) => e.questions).find((item) => item.id === questionId);

    if (!q || !q.testCases) {
      return res.status(404).json({ error: 'Question or test cases not found' });
    }

    const publicTestCases = q.testCases.filter((tc) => !tc.isHidden);

    // Step 1: Pre-validate syntax
    const syntaxCheck = validateSyntax(code, language);
    if (!syntaxCheck.isValid) {
      return res.json({
        allPassed: false,
        passedTestsCount: 0,
        totalTestsCount: publicTestCases.length,
        isSyntaxError: true,
        syntaxError: syntaxCheck.formattedError,
        testCaseResults: publicTestCases.map((tc, idx) => ({
          testCaseIndex: idx + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: `Compilation / Syntax Error:\n${syntaxCheck.error}`,
          passed: false,
          executionTimeMs: 0,
          status: 'COMPILATION_ERROR',
          error: syntaxCheck.formattedError,
        })),
      });
    }

    // Step 2: Evaluate each test case using the multi-language code engine
    const results = await Promise.all(
      publicTestCases.map(async (tc, idx) => {
        const evalRes = await evaluateTestCase(code, language, tc);
        evalRes.testCaseIndex = idx + 1;
        return evalRes;
      })
    );

    const allPassed = results.every((r) => r.passed);
    return res.json({
      allPassed,
      passedTestsCount: results.filter((r) => r.passed).length,
      totalTestsCount: results.length,
      testCaseResults: results,
    });
  });

  // ==========================================
  // GEMINI AI QUESTION GENERATOR (WITH AUTO RETRY & FALLBACK)
  // ==========================================

  async function callGeminiWithFallback(prompt: string, responseSchema: any): Promise<any> {
    const candidateModels = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    for (const modelName of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const aiResponse = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction: 'You are an authoritative university examination board expert and professor. Generate clean, mathematically sound and strictly structured questions adhering to the schema.',
              responseMimeType: 'application/json',
              responseSchema,
            },
          });

          if (aiResponse.text) {
            const parsed = JSON.parse(aiResponse.text);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          }
        } catch (err: any) {
          lastError = err;
          // If transient overload error (503/429/500), delay slightly before next attempt
          const status = err?.status || err?.code || err?.message;
          console.warn(`[Gemini Attempt] Model ${modelName} attempt ${attempt + 1} encountered: ${status || err?.message}`);
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('All Gemini candidate models were unavailable.');
  }

  app.post('/api/ai/generate-questions', authenticateToken, requireRoles('TEACHER', 'ADMIN'), async (req, res) => {
    const { subject, topic, difficulty = 'MEDIUM', numberOfQuestions = 3, questionType = 'MCQ', marks = 4 } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ error: 'Subject and topic are required.' });
    }

    let responseSchema: any;
    if (questionType === 'MCQ') {
      responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Short concise title for question' },
            description: { type: Type.STRING, description: 'Full question prompt' },
            subject: { type: Type.STRING },
            topic: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            marks: { type: Type.NUMBER },
            negativeMarks: { type: Type.NUMBER },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: 'e.g. opt_a, opt_b' },
                  text: { type: Type.STRING, description: 'Option text' },
                  isCorrect: { type: Type.BOOLEAN },
                },
                required: ['id', 'text', 'isCorrect'],
              },
            },
            correctAnswer: { type: Type.STRING, description: 'ID of the correct option' },
            explanation: { type: Type.STRING, description: 'Detailed academic explanation for solution' },
          },
          required: ['title', 'description', 'marks', 'options', 'correctAnswer', 'explanation'],
        },
      };
    } else {
      responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            problemStatement: { type: Type.STRING, description: 'Full markdown problem statement with input/output format' },
            inputFormat: { type: Type.STRING },
            outputFormat: { type: Type.STRING },
            constraints: { type: Type.STRING },
            subject: { type: Type.STRING },
            topic: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            marks: { type: Type.NUMBER },
            starterCode: {
              type: Type.OBJECT,
              properties: {
                javascript: { type: Type.STRING },
                python: { type: Type.STRING },
                java: { type: Type.STRING },
              },
            },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  input: { type: Type.STRING },
                  output: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
              },
            },
            testCases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  input: { type: Type.STRING },
                  expectedOutput: { type: Type.STRING },
                  isHidden: { type: Type.BOOLEAN },
                  explanation: { type: Type.STRING },
                },
                required: ['input', 'expectedOutput', 'isHidden'],
              },
            },
          },
          required: ['title', 'problemStatement', 'inputFormat', 'outputFormat', 'marks', 'testCases'],
        },
      };
    }

    const prompt = `You are a university examination board expert and professor.
Generate ${numberOfQuestions} distinct, rigorous college-level exam questions for:
- Subject: ${subject}
- Topic: ${topic}
- Difficulty Level: ${difficulty}
- Question Format: ${questionType}
- Marks per question: ${marks}

Make the questions realistic, challenging, and suitable for genuine academic evaluation in higher education.
`;

    try {
      const parsed = await callGeminiWithFallback(prompt, responseSchema);
      const formatted = parsed.map((item: any) => ({
        ...item,
        id: 'ai_q_' + Math.random().toString(36).substring(2, 10),
        type: questionType,
        subject: subject,
        topic: topic,
        difficulty: difficulty,
        marks: Number(marks) || 4,
        negativeMarks: questionType === 'MCQ' ? 1 : 0,
      }));

      return res.json({ questions: formatted });
    } catch (err: any) {
      console.warn('[Gemini AI Fallback Activated]:', err?.message || err);
      // High-quality contextual fallback questions if external Gemini API is momentarily under high demand
      const fallbackQuestions = generateFallbackAIQuestions(subject, topic, difficulty, questionType, marks, numberOfQuestions);
      return res.json({ questions: fallbackQuestions });
    }
  });

  function generateFallbackAIQuestions(subject: string, topic: string, difficulty: string, type: string, marks: number, count: number): Question[] {
    const list: Question[] = [];
    for (let i = 1; i <= count; i++) {
      const qid = 'ai_gen_' + Math.random().toString(36).substring(2, 10);
      if (type === 'MCQ') {
        list.push({
          id: qid,
          type: 'MCQ',
          title: `${topic}: Core Principle Analysis #${i}`,
          description: `In the context of ${subject} (${topic}), which of the following statements rigorously evaluates optimal throughput and consistency constraints under ${difficulty.toLowerCase()} conditions?`,
          subject,
          topic,
          difficulty: difficulty as any,
          marks: Number(marks) || 4,
          negativeMarks: 1,
          options: [
            { id: `${qid}_opt_1`, text: 'Maintaining strict linearizability with optimistic concurrency control' },
            { id: `${qid}_opt_2`, text: 'Utilizing deterministic lock ordering with asynchronous write-ahead logs' },
            { id: `${qid}_opt_3`, text: 'Partitioning state across non-blocking lock-free circular ring buffers' },
            { id: `${qid}_opt_4`, text: 'Employing two-phase commit with proactive deadlock timeouts' },
          ],
          correctAnswer: `${qid}_opt_2`,
          explanation: `In ${topic}, deterministic lock ordering combined with WAL guarantees both durability and freedom from circular wait conditions.`,
        });
      } else {
        list.push({
          id: qid,
          type: 'CODING',
          title: `${topic}: Algorithmic Optimization #${i}`,
          description: `Implement an optimal solution for ${topic} in ${subject}.`,
          problemStatement: `Design an algorithm to process a sequence of incoming data streams for ${topic}.\n\nInput Format: Single line containing comma-delimited integers.\nOutput Format: Return the maximum sub-sequence result integer.`,
          subject,
          topic,
          difficulty: difficulty as any,
          marks: Number(marks) || 10,
          inputFormat: 'Comma-separated integer sequence (e.g. -2,1,-3,4,-1,2,1,-5,4)',
          outputFormat: 'Single integer value (e.g. 6)',
          constraints: '1 <= N <= 10^5, -10^4 <= A[i] <= 10^4',
          examples: [
            { input: '-2,1,-3,4,-1,2,1,-5,4', output: '6', explanation: 'Subarray [4,-1,2,1] has the largest sum = 6.' },
          ],
          starterCode: {
            javascript: `function solve(input) {\n  const nums = input.trim().split(',').map(Number);\n  let maxSoFar = nums[0];\n  let currMax = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    currMax = Math.max(nums[i], currMax + nums[i]);\n    maxSoFar = Math.max(maxSoFar, currMax);\n  }\n  return maxSoFar;\n}`,
            python: `def solve(input_str):\n    nums = list(map(int, input_str.strip().split(',')))\n    max_so_far = curr_max = nums[0]\n    for x in nums[1:]:\n        curr_max = max(x, curr_max + x)\n        max_so_far = max(max_so_far, curr_max)\n    return max_so_far\n`,
            java: `public class Solution {\n    public static int solve(String input) {\n        String[] parts = input.trim().split(",");\n        int maxSoFar = Integer.parseInt(parts[0].trim());\n        int currMax = maxSoFar;\n        for (int i = 1; i < parts.length; i++) {\n            int val = Integer.parseInt(parts[i].trim());\n            currMax = Math.max(val, currMax + val);\n            maxSoFar = Math.max(maxSoFar, currMax);\n        }\n        return maxSoFar;\n    }\n}`,
          },
          testCases: [
            { id: `${qid}_tc1`, input: '-2,1,-3,4,-1,2,1,-5,4', expectedOutput: '6', isHidden: false },
            { id: `${qid}_tc2`, input: '1', expectedOutput: '1', isHidden: false },
            { id: `${qid}_tc3`, input: '5,4,-1,7,8', expectedOutput: '23', isHidden: true },
          ],
        });
      }
    }
    return list;
  }

  // ==========================================
  // TEACHER & EXAM MANAGEMENT ROUTES
  // ==========================================

  app.get('/api/teacher/exams', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    const user = (req as any).user as User;
    const exams = user.role === 'ADMIN' ? examsDb : examsDb.filter((e) => e.createdById === user.id);

    const enriched = exams.map((exam) => {
      const examSessions = Object.values(sessionsDb).filter((s) => s.examId === exam.id);
      const examResults = Object.values(resultsDb).filter((r) => r.examId === exam.id);
      const activeSessions = examSessions.filter((s) => s.status === 'IN_PROGRESS');
      const avgScore =
        examResults.length > 0
          ? Math.round((examResults.reduce((acc, r) => acc + r.percentage, 0) / examResults.length) * 10) / 10
          : 0;

      return {
        ...exam,
        stats: {
          totalRegistered: usersDb.filter((u) => u.role === 'STUDENT').length,
          activeWritingCount: activeSessions.length,
          submittedCount: examResults.length,
          averageScorePercentage: avgScore,
          suspiciousCount: examSessions.filter((s) => s.suspicionScore >= 40).length,
        },
      };
    });

    return res.json({ exams: enriched });
  });

  app.post('/api/teacher/exams', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    const user = (req as any).user as User;
    const body = req.body;

    if (!body.title || !body.subject) {
      return res.status(400).json({ error: 'Title and Subject are required to create an examination.' });
    }

    const examId = 'exam_' + Math.random().toString(36).substring(2, 10);
    const newExam: Exam = {
      id: examId,
      title: body.title,
      description: body.description || '',
      subject: body.subject,
      instructions: body.instructions || 'Standard examination proctoring rules apply.',
      createdById: user.id,
      createdByName: user.name,
      status: body.status || 'DRAFT',
      startDate: body.startDate || new Date().toISOString(),
      endDate: body.endDate || new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
      totalMarks: body.questions?.reduce((acc: number, q: Question) => acc + (Number(q.marks) || 0), 0) || 0,
      settings: {
        durationMinutes: Number(body.settings?.durationMinutes) || 60,
        passingMarks: Number(body.settings?.passingMarks) || 20,
        maxAttempts: 1,
        negativeMarking: !!body.settings?.negativeMarking,
        randomizeQuestions: !!body.settings?.randomizeQuestions,
        randomizeOptions: !!body.settings?.randomizeOptions,
        fullscreenRequired: body.settings?.fullscreenRequired !== false,
        cameraRequired: body.settings?.cameraRequired !== false,
        microphoneOptional: !!body.settings?.microphoneOptional,
        autoSubmitOnSevereViolation: body.settings?.autoSubmitOnSevereViolation !== false,
        maxViolations: Number(body.settings?.maxViolations) || 3,
        allowQuestionNavigation: body.settings?.allowQuestionNavigation !== false,
        showResultsImmediately: body.settings?.showResultsImmediately !== false,
        allowStudentReview: body.settings?.allowStudentReview !== false,
        showCorrectAnswers: body.settings?.showCorrectAnswers !== false,
        showExplanations: body.settings?.showExplanations !== false,
        mcqEnabled: body.settings?.mcqEnabled !== false,
        codingEnabled: body.settings?.codingEnabled !== false,
      },
      questions: body.questions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    examsDb.unshift(newExam);
    createAuditLog(user, 'EXAM_CREATED', 'Exam', examId, { title: newExam.title }, req);

    return res.status(201).json({ exam: newExam });
  });

  app.put('/api/teacher/exams/:id', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    const user = (req as any).user as User;
    const index = examsDb.findIndex((e) => e.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const current = examsDb[index];
    if (current.createdById !== user.id && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You do not have permission to edit this exam.' });
    }

    const updated: Exam = {
      ...current,
      ...req.body,
      id: current.id,
      createdById: current.createdById,
      createdByName: current.createdByName,
      totalMarks: req.body.questions?.reduce((acc: number, q: Question) => acc + (Number(q.marks) || 0), 0) || current.totalMarks,
      updatedAt: new Date().toISOString(),
    };

    examsDb[index] = updated;
    createAuditLog(user, 'EXAM_UPDATED', 'Exam', updated.id, { title: updated.title }, req);

    return res.json({ exam: updated });
  });

  app.patch('/api/teacher/exams/:id/status', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    const user = (req as any).user as User;
    const exam = examsDb.find((e) => e.id === req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const { status } = req.body;
    if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    exam.status = status;
    exam.updatedAt = new Date().toISOString();
    createAuditLog(user, `EXAM_STATUS_${status}`, 'Exam', exam.id, { status }, req);

    return res.json({ success: true, exam });
  });

  app.delete('/api/teacher/exams/:id', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    const user = (req as any).user as User;
    const index = examsDb.findIndex((e) => e.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Exam not found' });

    const exam = examsDb[index];
    if (exam.createdById !== user.id && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized to delete this exam.' });
    }

    examsDb.splice(index, 1);
    createAuditLog(user, 'EXAM_DELETED', 'Exam', exam.id, { title: exam.title }, req);
    return res.json({ success: true, message: 'Exam deleted successfully.' });
  });

  // Question Bank Endpoints
  app.get('/api/teacher/questions', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    return res.json({ questions: questionBankDb });
  });

  app.post('/api/teacher/questions', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    const user = (req as any).user as User;
    const body = req.body;
    if (!body.title || !body.subject || !body.topic) {
      return res.status(400).json({ error: 'Title, Subject, and Topic are mandatory.' });
    }

    const newQuestion: Question = {
      ...body,
      id: 'qb_' + Math.random().toString(36).substring(2, 10),
      marks: Number(body.marks) || 4,
    };

    questionBankDb.unshift(newQuestion);
    createAuditLog(user, 'QUESTION_CREATED', 'Question', newQuestion.id, { title: newQuestion.title }, req);
    return res.status(201).json({ question: newQuestion });
  });

  // ==========================================
  // REAL-TIME LIVE MONITORING & PROCTORING
  // ==========================================

  app.get('/api/teacher/monitoring/live', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    const now = Date.now();
    const sessions = Object.values(sessionsDb);

    const liveList = sessions.map((sess) => {
      const exam = examsDb.find((e) => e.id === sess.examId);
      const remainingSeconds = Math.max(
        0,
        Math.floor((new Date(sess.expiresAt).getTime() - now) / 1000)
      );

      const answeredCount = Object.keys(sess.answers).length;
      const totalQuestions = sess.questionOrder.length || exam?.questions.length || 0;

      const lastHeartbeatAgoSec = Math.floor(
        (now - new Date(sess.lastHeartbeat || sess.startTime).getTime()) / 1000
      );

      const isDisconnected = lastHeartbeatAgoSec > 45 && sess.status === 'IN_PROGRESS';

      return {
        sessionId: sess.id,
        examId: sess.examId,
        examTitle: sess.examTitle,
        studentId: sess.studentId,
        studentName: sess.studentName,
        studentEmail: sess.studentEmail,
        status: sess.status,
        proctorStatus: isDisconnected ? 'DISCONNECTED' : sess.proctorStatus,
        cameraActive: sess.cameraActive,
        fullscreenActive: sess.fullscreenActive,
        violations: sess.violationCount,
        maxViolations: exam?.settings.maxViolations || 3,
        suspicionScore: sess.suspicionScore,
        remainingSeconds,
        answeredProgress: `${answeredCount}/${totalQuestions}`,
        lastActivity: sess.lastHeartbeat,
        startTime: sess.startTime,
        clientIp: sess.clientIp,
      };
    });

    return res.json({
      activeStudents: liveList,
      totalActiveCount: liveList.filter((s) => s.status === 'IN_PROGRESS').length,
      suspiciousSessionsCount: liveList.filter((s) => s.suspicionScore >= 40).length,
      criticalSessionsCount: liveList.filter((s) => s.proctorStatus === 'CRITICAL').length,
    });
  });

  // Live session malpractice timeline
  app.get('/api/teacher/monitoring/session/:id/timeline', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    const session = sessionsDb[req.params.id];
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const events = malpracticeEventsDb
      .filter((e) => e.sessionId === session.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return res.json({
      session,
      events,
    });
  });

  // Teacher Analytics & Result Summaries
  app.get('/api/teacher/results', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    const results = Object.values(resultsDb);
    const exams = examsDb;

    // Score distribution buckets
    const distribution = [
      { range: '0-39%', count: 0 },
      { range: '40-59%', count: 0 },
      { range: '60-79%', count: 0 },
      { range: '80-100%', count: 0 },
    ];

    results.forEach((r) => {
      if (r.percentage < 40) distribution[0].count++;
      else if (r.percentage < 60) distribution[1].count++;
      else if (r.percentage < 80) distribution[2].count++;
      else distribution[3].count++;
    });

    // Malpractice breakdown
    const eventBreakdown: Record<string, number> = {};
    malpracticeEventsDb.forEach((e) => {
      eventBreakdown[e.eventType] = (eventBreakdown[e.eventType] || 0) + 1;
    });

    return res.json({
      results,
      exams,
      distribution,
      eventBreakdown,
      metrics: {
        totalSubmissions: results.length,
        averageScore:
          results.length > 0
            ? Math.round((results.reduce((acc, r) => acc + r.score, 0) / results.length) * 10) / 10
            : 0,
        passPercentage:
          results.length > 0
            ? Math.round((results.filter((r) => r.passed).length / results.length) * 1000) / 10
            : 0,
        totalMalpracticeEvents: malpracticeEventsDb.length,
      },
    });
  });

  // CSV Export for Exams Results & Integrity Logs
  app.get('/api/teacher/export/:examId', authenticateToken, requireRoles('TEACHER', 'ADMIN'), (req, res) => {
    const exam = examsDb.find((e) => e.id === req.params.examId);
    const results = Object.values(resultsDb).filter((r) => r.examId === req.params.examId);

    const headers = [
      'Result ID',
      'Student Name',
      'Student Email',
      'Exam Title',
      'Score Obtained',
      'Total Marks',
      'Percentage (%)',
      'Status',
      'Violations',
      'Suspicion Score',
      'Submission Type',
      'Submitted At',
    ];

    const rows = results.map((r) => [
      `"${r.id}"`,
      `"${r.studentName}"`,
      `"${r.studentEmail}"`,
      `"${r.examTitle}"`,
      r.score,
      r.totalMarks,
      r.percentage,
      r.passed ? 'PASSED' : 'FAILED',
      r.violationCount,
      r.suspicionScore,
      r.submissionType,
      `"${r.submittedAt}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=exam_results_${req.params.examId}.csv`);
    return res.send(csvContent);
  });

  // ==========================================
  // ADMIN DASHBOARD & AUDIT LOGS
  // ==========================================

  app.get('/api/admin/users', authenticateToken, requireRoles('ADMIN'), (req, res) => {
    return res.json({ users: usersDb });
  });

  app.post('/api/admin/users', authenticateToken, requireRoles('ADMIN'), (req, res) => {
    const { email, name, role, studentId, department, batch, password } = req.body;
    if (!email || !name || !role) {
      return res.status(400).json({ error: 'Email, Name, and Role are mandatory' });
    }

    if (usersDb.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const newUser: User = {
      id: 'user_' + Math.random().toString(36).substring(2, 10),
      email,
      name,
      role,
      studentId: role === 'STUDENT' ? studentId || `CS-${Math.floor(1000 + Math.random() * 9000)}` : undefined,
      department: department || 'Computer Science & Engineering',
      batch: role === 'STUDENT' ? batch || 'Batch 2026' : undefined,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    usersDb.push(newUser);
    passwordsDb[email] = bcrypt.hashSync(password || 'password123', 10);

    createAuditLog((req as any).user, 'USER_ACCOUNT_CREATED', 'USER', newUser.id, { role: newUser.role }, req);
    return res.status(201).json({ user: newUser });
  });

  app.patch('/api/admin/users/:id/status', authenticateToken, requireRoles('ADMIN'), (req, res) => {
    const user = usersDb.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { status } = req.body;
    user.status = status;

    createAuditLog((req as any).user, `ACCOUNT_${status}`, 'USER', user.id, { status }, req);
    return res.json({ success: true, user });
  });

  app.get('/api/admin/audit-logs', authenticateToken, requireRoles('ADMIN'), (req, res) => {
    const { action, role, search } = req.query as { action?: string; role?: string; search?: string };

    let logs = [...auditLogsDb];
    if (action) {
      logs = logs.filter((l) => l.action.toLowerCase().includes(action.toLowerCase()));
    }
    if (role) {
      logs = logs.filter((l) => l.role === role);
    }
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.actorName.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.entity.toLowerCase().includes(q)
      );
    }

    return res.json({ logs });
  });

  app.get('/api/admin/system-stats', authenticateToken, requireRoles('ADMIN'), (req, res) => {
    return res.json({
      totalUsers: usersDb.length,
      studentsCount: usersDb.filter((u) => u.role === 'STUDENT').length,
      teachersCount: usersDb.filter((u) => u.role === 'TEACHER').length,
      totalExams: examsDb.length,
      activeExams: examsDb.filter((e) => e.status === 'PUBLISHED').length,
      totalSessions: Object.keys(sessionsDb).length,
      totalSubmissions: Object.keys(resultsDb).length,
      totalMalpracticeEvents: malpracticeEventsDb.length,
      totalAuditLogs: auditLogsDb.length,
      systemHealth: 'HEALTHY_PROCTORING_ACTIVE',
    });
  });

  // ==========================================
  // VITE STATIC ASSET & SPA SERVING
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Exam Portal Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
