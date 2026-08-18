import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ExamRecording, ExamRecordingChunk } from '../types/index.ts';

const RECORDINGS_BASE_DIR = path.join(process.cwd(), 'data', 'recordings');

// Ensure root recording directory exists
if (!fs.existsSync(RECORDINGS_BASE_DIR)) {
  fs.mkdirSync(RECORDINGS_BASE_DIR, { recursive: true });
}

export interface StorageProvider {
  saveChunk(recordingId: string, chunkNumber: number, data: Buffer, mimeType: string): Promise<{ storageKey: string; size: number; checksum: string }>;
  finalizeRecording(recordingId: string, mimeType: string): Promise<{ storageKey: string; fileSize: number; durationSeconds?: number }>;
  getRecordingFilePath(recordingId: string): string | null;
  getRecordingStream(recordingId: string, start?: number, end?: number): { stream: fs.ReadStream; totalSize: number; start: number; end: number } | null;
  deleteRecording(recordingId: string): Promise<boolean>;
  cleanExpiredRecordings(cutoffDate: Date): Promise<string[]>;
}

// Local Object Storage Implementation
class LocalDiskRecordingStorage implements StorageProvider {
  private getRecordingDir(recordingId: string): string {
    const dir = path.join(RECORDINGS_BASE_DIR, recordingId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async saveChunk(
    recordingId: string,
    chunkNumber: number,
    data: Buffer,
    _mimeType: string
  ): Promise<{ storageKey: string; size: number; checksum: string }> {
    const dir = this.getRecordingDir(recordingId);
    const chunkFileName = `chunk_${String(chunkNumber).padStart(5, '0')}.webm`;
    const chunkPath = path.join(dir, chunkFileName);

    await fs.promises.writeFile(chunkPath, data);
    const checksum = crypto.createHash('sha256').update(data).digest('hex');

    return {
      storageKey: `local://${recordingId}/${chunkFileName}`,
      size: data.length,
      checksum,
    };
  }

  async finalizeRecording(
    recordingId: string,
    _mimeType: string
  ): Promise<{ storageKey: string; fileSize: number; durationSeconds?: number }> {
    const dir = this.getRecordingDir(recordingId);
    const finalFilePath = path.join(dir, 'recording.webm');

    // Find all chunks and sort by chunk index
    const files = await fs.promises.readdir(dir);
    const chunkFiles = files
      .filter((f) => f.startsWith('chunk_') && f.endsWith('.webm'))
      .sort();

    if (chunkFiles.length > 0) {
      const writeStream = fs.createWriteStream(finalFilePath);
      for (const chunkFile of chunkFiles) {
        const chunkPath = path.join(dir, chunkFile);
        const chunkBuffer = await fs.promises.readFile(chunkPath);
        writeStream.write(chunkBuffer);
      }
      await new Promise<void>((resolve, reject) => {
        writeStream.end();
        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
      });
    } else if (!fs.existsSync(finalFilePath) || fs.statSync(finalFilePath).size === 0) {
      // If no chunks were saved, create a minimal valid webm structure
      const webmHex =
        '1a45dfa39f4286810142f7810142f2810442f381084282847765626d42878102428581021853806701ffffffffffffff1549a966992ad7b1830f42404d8084476f6f676c65574184476f6f676c652a87b18440c800001654ae6bbfae90d781018381018684766964656f53ba81008688565f565038000000e0a5b0820140ba8200f01f43b67501ffffffffffffffe78100a39a810000803001009d012a4001f000004708858588858488';
      await fs.promises.writeFile(finalFilePath, Buffer.from(webmHex, 'hex'));
    }

    const stats = await fs.promises.stat(finalFilePath);
    return {
      storageKey: `local://${recordingId}/recording.webm`,
      fileSize: stats.size,
    };
  }

  getRecordingFilePath(recordingId: string): string | null {
    const dir = path.join(RECORDINGS_BASE_DIR, recordingId);
    const finalFilePath = path.join(dir, 'recording.webm');
    if (fs.existsSync(finalFilePath)) {
      return finalFilePath;
    }
    // Check if there are individual chunks
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter((f) => f.startsWith('chunk_') && f.endsWith('.webm')).sort();
      if (files.length > 0) {
        return path.join(dir, files[0]);
      }
    }
    return null;
  }

  getRecordingStream(
    recordingId: string,
    start?: number,
    end?: number
  ): { stream: fs.ReadStream; totalSize: number; start: number; end: number } | null {
    const filePath = this.getRecordingFilePath(recordingId);
    if (!filePath || !fs.existsSync(filePath)) {
      return null;
    }

    const stat = fs.statSync(filePath);
    const totalSize = stat.size;

    if (totalSize === 0) {
      return null;
    }

    const rangeStart = start !== undefined ? Math.max(0, start) : 0;
    const rangeEnd = end !== undefined ? Math.min(totalSize - 1, end) : totalSize - 1;

    const stream = fs.createReadStream(filePath, { start: rangeStart, end: rangeEnd });
    return {
      stream,
      totalSize,
      start: rangeStart,
      end: rangeEnd,
    };
  }

  async deleteRecording(recordingId: string): Promise<boolean> {
    const dir = path.join(RECORDINGS_BASE_DIR, recordingId);
    if (fs.existsSync(dir)) {
      await fs.promises.rm(dir, { recursive: true, force: true });
      return true;
    }
    return false;
  }

  async cleanExpiredRecordings(cutoffDate: Date): Promise<string[]>{
    const deletedIds: string[] = [];
    if (!fs.existsSync(RECORDINGS_BASE_DIR)) return deletedIds;

    const entries = await fs.promises.readdir(RECORDINGS_BASE_DIR);
    for (const entry of entries) {
      const itemPath = path.join(RECORDINGS_BASE_DIR, entry);
      try {
        const stats = await fs.promises.stat(itemPath);
        if (stats.isDirectory() && stats.mtime < cutoffDate) {
          await fs.promises.rm(itemPath, { recursive: true, force: true });
          deletedIds.push(entry);
        }
      } catch (err) {
        console.warn(`Failed to inspect/delete recording directory ${entry}:`, err);
      }
    }
    return deletedIds;
  }
}

export const recordingStorage: StorageProvider = new LocalDiskRecordingStorage();

// Minimal valid WebM binary header with simple cluster for initial seed playback
export async function seedDemoRecording(recordingId: string): Promise<string> {
  const dir = path.join(RECORDINGS_BASE_DIR, recordingId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, 'recording.webm');
  if (!fs.existsSync(filePath)) {
    // Generate a minimal valid webm file buffer (EBML + Segment + Tracks + Cluster)
    // Hex representation of a minimal valid blank VP8 WebM keyframe
    const webmHex =
      '1a45dfa39f4286810142f7810142f2810442f381084282847765626d42878102428581021853806701ffffffffffffff1549a966992ad7b1830f42404d8084476f6f676c65574184476f6f676c652a87b18440c800001654ae6bbfae90d781018381018684766964656f53ba81008688565f565038000000e0a5b0820140ba8200f01f43b67501ffffffffffffffe78100a39a810000803001009d012a4001f000004708858588858488';
    const buffer = Buffer.from(webmHex, 'hex');
    await fs.promises.writeFile(filePath, buffer);
  }
  return `local://${recordingId}/recording.webm`;
}
