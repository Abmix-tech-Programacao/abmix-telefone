import { EventEmitter } from 'events';
import { writeFileSync, existsSync, mkdirSync, createWriteStream } from 'fs';
import { join } from 'path';
import { queries } from '../database';

export interface RecordingSession {
  callId: string;
  filename: string;
  startTime: number;
  isActive: boolean;
  stream?: any;
  chunks: Buffer[];
}

export class RecordingProvider extends EventEmitter {
  private sessions = new Map<string, RecordingSession>();
  private recordingsDir: string;

  constructor() {
    super();
    this.recordingsDir = join(process.cwd(), 'recordings');
    
    // Ensure recordings directory exists
    if (!existsSync(this.recordingsDir)) {
      mkdirSync(this.recordingsDir, { recursive: true });
    }
  }

  // Start recording for a call
  startRecording(callId: string, phoneNumber?: string): boolean {
    try {
      if (this.sessions.has(callId)) {
        console.warn(`[RECORDING] Recording already active for call ${callId}`);
        return false;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `call_${callId}_${timestamp}.wav`;
      const filepath = join(this.recordingsDir, filename);

      const session: RecordingSession = {
        callId,
        filename,
        startTime: Date.now(),
        isActive: true,
        chunks: []
      };

      this.sessions.set(callId, session);

      // Add to database
      try {
        queries.addRecording.run(callId, phoneNumber || 'unknown', filename);
        console.log(`[RECORDING] Started recording for call ${callId}: ${filename}`);
      } catch (dbError) {
        console.error(`[RECORDING] Database error for call ${callId}:`, dbError);
      }

      this.emit('recording-started', { callId, filename });
      return true;

    } catch (error) {
      console.error(`[RECORDING] Error starting recording for call ${callId}:`, error);
      return false;
    }
  }

  // Add audio chunk to recording
  addAudioChunk(callId: string, audioData: Buffer): boolean {
    const session = this.sessions.get(callId);
    
    if (!session || !session.isActive) {
      return false;
    }

    try {
      session.chunks.push(audioData);
      
      // Emit chunk for real-time processing
      this.emit('audio-chunk', { callId, audioData });
      
      return true;
    } catch (error) {
      console.error(`[RECORDING] Error adding audio chunk for call ${callId}:`, error);
      return false;
    }
  }

  // Stop recording and save file
  stopRecording(callId: string): boolean {
    const session = this.sessions.get(callId);
    
    if (!session || !session.isActive) {
      console.warn(`[RECORDING] No active recording found for call ${callId}`);
      return false;
    }

    try {
      session.isActive = false;
      const duration = Math.floor((Date.now() - session.startTime) / 1000);
      
      // Combine all audio chunks
      const totalLength = session.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedBuffer = Buffer.concat(session.chunks, totalLength);
      
      // Save to file
      const filepath = join(this.recordingsDir, session.filename);
      writeFileSync(filepath, combinedBuffer);
      
      // Update database
      try {
        const recording = queries.getRecordingByCallSid.get(callId) as any;
        if (recording) {
          queries.updateRecording.run(duration, combinedBuffer.length, recording.id);
        }
      } catch (dbError) {
        console.error(`[RECORDING] Database update error for call ${callId}:`, dbError);
      }

      console.log(`[RECORDING] Stopped recording for call ${callId}: ${session.filename} (${duration}s, ${combinedBuffer.length} bytes)`);
      
      this.emit('recording-stopped', { 
        callId, 
        filename: session.filename, 
        duration, 
        size: combinedBuffer.length 
      });

      this.sessions.delete(callId);
      return true;

    } catch (error) {
      console.error(`[RECORDING] Error stopping recording for call ${callId}:`, error);
      return false;
    }
  }

  // Get recording status
  getRecordingStatus(callId: string): RecordingSession | null {
    return this.sessions.get(callId) || null;
  }

  // Get all active recordings
  getActiveRecordings(): RecordingSession[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  // Get recordings directory path
  getRecordingsDirectory(): string {
    return this.recordingsDir;
  }

  // Cleanup old recordings (called periodically)
  cleanupOldRecordings(maxAgeHours: number = 24 * 7): number { // Default: 1 week
    try {
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      let cleanedCount = 0;

      // Get old recordings from database
      const recordings = queries.getAllRecordings.all() as any[];
      
      for (const recording of recordings) {
        const recordingTime = new Date(recording.started_at).getTime();
        
        if (recordingTime < cutoffTime) {
          try {
            const filepath = join(this.recordingsDir, recording.filename);
            if (existsSync(filepath)) {
              require('fs').unlinkSync(filepath);
            }
            
            queries.deleteRecording.run(recording.id);
            cleanedCount++;
          } catch (error) {
            console.error(`[RECORDING] Error cleaning up recording ${recording.filename}:`, error);
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`[RECORDING] Cleaned up ${cleanedCount} old recordings`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('[RECORDING] Error during cleanup:', error);
      return 0;
    }
  }
}

export const recordingProvider = new RecordingProvider();
