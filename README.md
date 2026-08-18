#  Smart Exam Monitoring System

An **AI-powered secure online examination platform** designed to conduct reliable, scalable, and malpractice-resistant online examinations.

The system supports **MCQ and coding examinations**, real-time student monitoring, anti-malpractice detection, AI-assisted question generation, automated exam evaluation, and teacher/admin analytics.

---

##  Key Features

###  Student Module

* Secure student login and authentication
* Student dashboard
* View available examinations
* MCQ-based examinations
* Coding examinations
* Real-time exam timer
* Automatic answer saving
* Automatic exam submission
* Exam instructions and guidelines
* Exam result and performance analysis
* Responsive examination interface

###  Teacher Module

* Teacher dashboard
* Create and manage examinations
* Add MCQ questions
* Add coding questions
* Customize question papers
* Set exam duration
* Set marks and negative marking
* Schedule examinations
* Monitor students during live examinations
* View suspicious activity
* View individual student activity
* View examination recordings
* Review malpractice incidents
* View student performance analytics

###  AI-Powered Features

* AI-assisted question generation
* Generate questions from selected topics/keywords
* Difficulty-based question generation
* AI-assisted question paper creation
* Intelligent examination analytics
* Suspicious activity analysis
* Automated performance insights

### Anti-Malpractice & AI Proctoring

The platform is designed with multiple layers of examination security:

* Full-screen enforcement
* Tab switching detection
* Window focus monitoring
* Copy prevention
* Paste prevention
* Right-click prevention
* Keyboard shortcut monitoring
* Multiple suspicious activity detection
* Camera-based student monitoring
* Microphone permission support
* Face presence monitoring
* Suspicious activity logging
* Real-time violation alerts
* Automatic violation counting
* Configurable malpractice thresholds
* Automatic exam submission for severe violations

> **Note:** Browser-based security controls have inherent limitations. The system therefore uses multiple monitoring signals instead of relying on a single prevention mechanism.

---

## Coding Examination

Students can solve programming problems directly inside the examination portal.

### Features

* Online code editor
* Multiple programming language support
* Run code
* Submit code
* Test case evaluation
* Automatic scoring
* Coding question management
* Execution result display
* Time-based examination control

---

##  Examination Analytics

Teachers and administrators can monitor:

* Total students
* Active examinations
* Completed examinations
* Average score
* Highest score
* Student performance
* Question-wise performance
* Suspicious activity count
* Malpractice incidents
* Exam completion statistics

Interactive dashboards provide a quick overview of examination performance and security events.

---

##  Real-Time Malpractice Monitoring

During an examination, suspicious activities are continuously recorded.

Example events include:

```text
TAB_SWITCH
WINDOW_BLUR
FULLSCREEN_EXIT
COPY_ATTEMPT
PASTE_ATTEMPT
RIGHT_CLICK
KEYBOARD_SHORTCUT
CAMERA_PERMISSION_CHANGE
MULTIPLE_FACE_DETECTED
NO_FACE_DETECTED
```

Each event can be associated with:

* Student
* Examination
* Timestamp
* Violation type
* Severity
* Incident count

This allows teachers to review suspicious events after or during an examination.

---


---
Complete Stack

Frontend: React 19, TypeScript, Vite, Tailwind CSS
Backend: Node.js, Express.js, TypeScript
Database: MongoDB with Mongoose, Local MongoDB Server
AI: Google Gemini API
Authentication: JWT, bcrypt
Proctoring: WebRTC, Fullscreen API, Page Visibility API
Analytics: Recharts
Version Control: Git, GitHub



Student Login
     ↓
Dashboard
     ↓
Select Examination
     ↓
Read Instructions
     ↓
Camera / Permissions Check
     ↓
Start Examination
     ↓
Full-Screen Mode
     ↓
Answer Questions
     ↓
Real-Time Monitoring
     ↓
Suspicious Activity Detection
     ↓
Submit Examination
     ↓
Automatic Evaluation
     ↓
Result & Performance Analysis
```

---

## Security Approach

The platform follows a **multi-layer security approach**.

Instead of depending on a single anti-cheating mechanism, multiple browser events and monitoring signals are collected and correlated.

### Security Layers

**Layer 1 — Authentication**

* Secure login
* Role-based access
* Student/Teacher/Admin separation

**Layer 2 — Exam Environment**

* Full-screen mode
* Restricted browser interactions
* Keyboard event monitoring
* Copy/paste restrictions

**Layer 3 — Activity Monitoring**

* Tab switching
* Window focus
* Suspicious keyboard actions
* Exam navigation events

**Layer 4 — Camera Monitoring**

* Camera permission
* Face presence monitoring
* Suspicious visual events

**Layer 5 — Incident Management**

* Violation logging
* Severity classification
* Incident history
* Teacher review
* Configurable automatic actions

---

##  Problem Statement

Traditional online examination systems often struggle with:

* Cheating through browser tabs
* Unauthorized resources
* Copy/paste of answers
* Lack of real-time supervision
* Difficulty monitoring large numbers of students
* Manual evaluation of coding examinations
* Limited examination analytics

The **Smart Exam Monitoring System** addresses these challenges by combining online examination, automated monitoring, AI capabilities, and analytics into a single platform.

---

##  Our Solution

The proposed system provides a centralized platform where institutions can:

1. Create examinations
2. Generate questions using AI
3. Conduct MCQ and coding exams
4. Monitor students in real time
5. Detect suspicious activities
6. Record examination incidents
7. Automatically evaluate answers
8. Analyze student performance
9. Review malpractice evidence
10. Manage examinations from a single dashboard

---

##  Innovation

### AI Question Generator

Teachers can provide:

```text
Topic: Data Structures
Difficulty: Medium
Question Type: MCQ
Number of Questions: 10
```

The system can generate a structured question set using AI.

### Intelligent Proctoring

Instead of simply detecting one event such as tab switching, the system can combine multiple suspicious signals and maintain a **violation score** for each student.

### Unified Examination Platform

The platform combines:

```text
MCQ Exam
     +
Coding Exam
     +
AI Question Generation
     +
Online Proctoring
     +
Anti-Malpractice
     +
Analytics
```

in one system.

---

##  Future Enhancements

* Advanced AI-based face verification
* Multi-person detection
* Object detection for unauthorized devices
* Advanced behavioral analysis
* Institution-level examination management
* Cloud scalability
* Advanced plagiarism detection
* AI-generated performance reports
* Mobile-responsive proctoring improvements
* Distributed code execution infrastructure
* Real-time WebSocket-based monitoring



## 🧪 Testing

The application should be tested for:

* Authentication
* Exam creation
* Exam participation
* Timer functionality
* Auto-save
* Exam submission
* MCQ evaluation
* Coding evaluation
* Tab switching
* Full-screen exit
* Copy/paste attempts
* Camera permissions
* Violation logging
* Teacher monitoring
* Result generation

---

>  Security +  AI +  Online Examination +  Proctoring +  Coding Evaluation + Analytics

The goal is to make online examinations **more secure, scalable, transparent, and intelligent**.

