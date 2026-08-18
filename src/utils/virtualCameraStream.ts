/**
 * Virtual Proctoring Camera Stream Provider
 * Generates an active, realistic simulated webcam video stream via HTML5 Canvas
 * when hardware webcam is unavailable, blocked by browser permissions, or in sandbox iframe.
 */

export interface CameraStreamResult {
  stream: MediaStream;
  isVirtual: boolean;
  error?: string;
}

// Active canvas animations reference map for cleanup
const activeAnimationMap = new WeakMap<MediaStream, () => void>();

/**
 * Creates a synthetic animated video stream simulating an exam candidate in a proctored room.
 */
export function createVirtualProctorStream(
  candidateName = 'Alex Rivera',
  candidateId = 'CS2026-0842'
): MediaStream {
  if (typeof document === 'undefined') {
    // SSR fallback if called outside browser
    return new MediaStream();
  }

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new MediaStream();
  }

  let frameCount = 0;
  let isRunning = true;

  // Animation parameters for subtle human movement
  let eyeBlinkTimer = 0;
  let isBlinking = false;
  let headNodOffset = 0;
  let scanlineY = 0;

  function renderFrame() {
    if (!isRunning || !ctx) return;
    frameCount++;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Dark professional examination room background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#101418');
    bgGradient.addColorStop(0.6, '#181C22');
    bgGradient.addColorStop(1, '#0C0E12');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle background room elements (door frame / bookshelf hint)
    ctx.strokeStyle = '#222832';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 40, 140, 260);
    ctx.strokeRect(450, 60, 150, 200);

    // Subtle breathing / head sway calculation
    const breath = Math.sin(frameCount * 0.05) * 3;
    const sway = Math.cos(frameCount * 0.02) * 2;
    headNodOffset = Math.sin(frameCount * 0.08) * 1.5;

    // Eye blink trigger every ~120 frames
    eyeBlinkTimer++;
    if (eyeBlinkTimer > 110 && eyeBlinkTimer < 118) {
      isBlinking = true;
    } else {
      isBlinking = false;
      if (eyeBlinkTimer >= 120) eyeBlinkTimer = 0;
    }

    const centerX = width / 2 + sway;
    const centerY = height / 2 + 30 + breath;

    // 2. Candidate Body / Shoulders (Dark Navy / Charcoal T-shirt)
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 170, 140, 100, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Collar detail
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 105, 45, 25, 0, 0, Math.PI);
    ctx.fill();

    // 3. Candidate Neck
    ctx.fillStyle = '#D4A373';
    ctx.fillRect(centerX - 24, centerY + 50, 48, 55);

    // 4. Candidate Head / Face
    ctx.fillStyle = '#E6BC98';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + headNodOffset, 65, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#1A110B';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - 25 + headNodOffset, 68, 65, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // Hair sides
    ctx.beginPath();
    ctx.ellipse(centerX - 58, centerY + headNodOffset, 14, 40, 0, 0, Math.PI * 2);
    ctx.ellipse(centerX + 58, centerY + headNodOffset, 14, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Eyebrows & Eyes
    ctx.fillStyle = '#261C14';
    ctx.fillRect(centerX - 38, centerY - 15 + headNodOffset, 24, 4);
    ctx.fillRect(centerX + 14, centerY - 15 + headNodOffset, 24, 4);

    if (isBlinking) {
      // Closed eyelids
      ctx.strokeStyle = '#261C14';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX - 26, centerY - 2 + headNodOffset, 8, 0, Math.PI);
      ctx.arc(centerX + 26, centerY - 2 + headNodOffset, 8, 0, Math.PI);
      ctx.stroke();
    } else {
      // Open eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(centerX - 26, centerY - 2 + headNodOffset, 10, 6, 0, 0, Math.PI * 2);
      ctx.ellipse(centerX + 26, centerY - 2 + headNodOffset, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Iris / Pupils looking forward with subtle micro-saccades
      const gazeShift = Math.sin(frameCount * 0.03) * 1.2;
      ctx.fillStyle = '#3E2723';
      ctx.beginPath();
      ctx.arc(centerX - 26 + gazeShift, centerY - 2 + headNodOffset, 4.5, 0, Math.PI * 2);
      ctx.arc(centerX + 26 + gazeShift, centerY - 2 + headNodOffset, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Pupil center
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(centerX - 26 + gazeShift, centerY - 2 + headNodOffset, 2, 0, Math.PI * 2);
      ctx.arc(centerX + 26 + gazeShift, centerY - 2 + headNodOffset, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Nose & Mouth
    ctx.strokeStyle = '#C58F60';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + 2 + headNodOffset);
    ctx.lineTo(centerX - 3, centerY + 18 + headNodOffset);
    ctx.lineTo(centerX + 3, centerY + 20 + headNodOffset);
    ctx.stroke();

    // Neutral / Focused Exam Mouth
    ctx.strokeStyle = '#9E5B38';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 42 + headNodOffset, 12, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // 7. AI Proctor Bounding Box / Facial Landmark Tracking Overlay
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    const boxW = 160;
    const boxH = 200;
    const boxX = centerX - boxW / 2;
    const boxY = centerY - 80 + headNodOffset;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.setLineDash([]);

    // Corner brackets on Face Bounding Box
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    const bracketLen = 14;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + bracketLen);
    ctx.lineTo(boxX, boxY);
    ctx.lineTo(boxX + bracketLen, boxY);
    ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(boxX + boxW - bracketLen, boxY);
    ctx.lineTo(boxX + boxW, boxY);
    ctx.lineTo(boxX + boxW, boxY + bracketLen);
    ctx.stroke();
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + boxH - bracketLen);
    ctx.lineTo(boxX, boxY + boxH);
    ctx.lineTo(boxX + bracketLen, boxY + boxH);
    ctx.stroke();
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(boxX + boxW - bracketLen, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH);
    ctx.lineTo(boxX + boxW, boxY + boxH - bracketLen);
    ctx.stroke();

    // AI Confidence Tag
    ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
    ctx.fillRect(boxX, boxY - 18, 120, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('FACE: 99.4% VERIFIED', boxX + 4, boxY - 6);

    // 8. Subtle animated scanning line
    scanlineY = (scanlineY + 1.5) % height;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
    ctx.fillRect(0, scanlineY, width, 4);

    // 9. Telemetry & Security Watermarks
    // Top Left: Recording Status Badge
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 170, 24);
    ctx.strokeStyle = '#2C2F33';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 170, 24);

    // Blinking red REC dot
    const recBlink = Math.floor(frameCount / 25) % 2 === 0;
    ctx.fillStyle = recBlink ? '#EF4444' : '#7F1D1D';
    ctx.beginPath();
    ctx.arc(22, 22, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('PROCTOR REC ● LIVE', 32, 25);

    // Top Right: Live ISO Clock
    const now = new Date();
    const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(width - 190, 10, 180, 24);
    ctx.strokeRect(width - 190, 10, 180, 24);
    ctx.fillStyle = '#60A5FA';
    ctx.font = '10px monospace';
    ctx.fillText(timeStr, width - 182, 25);

    // Bottom Watermark: Candidate Info
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(10, height - 34, width - 20, 24);
    ctx.strokeRect(10, height - 34, width - 20, 24);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px monospace';
    ctx.fillText(`CANDIDATE: ${candidateName.toUpperCase()} | ID: ${candidateId} | CAM: SENSOR_01`, 18, height - 18);

    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('SECURE 1080p FEED', width - 140, height - 18);

    requestAnimationFrame(renderFrame);
  }

  // Kick off frame loop
  requestAnimationFrame(renderFrame);

  // Capture stream from canvas at 30 fps
  const stream = (canvas as any).captureStream ? canvas.captureStream(30) : new MediaStream();

  // Attach stop listener for memory cleanup
  activeAnimationMap.set(stream, () => {
    isRunning = false;
  });

  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack) {
    const originalStop = videoTrack.stop.bind(videoTrack);
    videoTrack.stop = () => {
      isRunning = false;
      originalStop();
    };
  }

  return stream;
}

/**
 * Initializes camera stream:
 * 1. Tries physical hardware camera via navigator.mediaDevices.getUserMedia
 * 2. If blocked / unavailable, automatically creates virtual proctor stream fallback
 */
export async function getOrInitProctorCamera(
  candidateName = 'Alex Rivera',
  candidateId = 'CS2026-0842',
  forceVirtual = false
): Promise<CameraStreamResult> {
  if (forceVirtual) {
    const stream = createVirtualProctorStream(candidateName, candidateId);
    return { stream, isVirtual: true };
  }

  if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const hardwareStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      return {
        stream: hardwareStream,
        isVirtual: false,
      };
    } catch (err: any) {
      console.warn('Physical camera access unavailable or denied. Falling back to Virtual Proctor Stream:', err);
      const stream = createVirtualProctorStream(candidateName, candidateId);
      return {
        stream,
        isVirtual: true,
        error: err?.message || 'Hardware camera unavailable',
      };
    }
  }

  // Fallback for environments without mediaDevices
  const stream = createVirtualProctorStream(candidateName, candidateId);
  return {
    stream,
    isVirtual: true,
    error: 'MediaDevices API not available in browser runtime',
  };
}
