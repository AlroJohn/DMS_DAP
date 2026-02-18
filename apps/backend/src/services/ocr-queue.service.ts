import path from 'path';
import fs from 'fs';
import { Worker } from 'worker_threads';

type OcrJob = {
  jobId: string;
  documentId: string;
  storagePath: string;
  mimeType: string;
  originalName: string;
};

class OcrQueueService {
  private worker: Worker | null = null;
  private queue: OcrJob[] = [];
  private processing = false;
  private restartAttempts = 0;
  private readonly MAX_RESTART_ATTEMPTS = 3;

  constructor() {
    this.initWorker();
  }

  enqueue(job: OcrJob) {
    this.queue.push(job);
    this.processNext();
  }

  private initWorker() {
    if (this.worker) {
      return;
    }

    if (this.restartAttempts >= this.MAX_RESTART_ATTEMPTS) {
      console.error(`[OcrQueue] Max restart attempts (${this.MAX_RESTART_ATTEMPTS}) reached. Worker disabled.`);
      return;
    }

    // Check for TypeScript file first (development), fallback to JS (production)
    const tsPath = path.join(__dirname, '..', 'workers', 'ocr.worker.ts');
    const jsPath = path.join(__dirname, '..', 'workers', 'ocr.worker.js');
    
    // Prefer TS file if it exists, regardless of environment
    const workerPath = fs.existsSync(tsPath) ? tsPath : jsPath;
    const execArgv = workerPath.endsWith('.ts') ? ['-r', 'tsx/cjs'] : [];
    
    if (!fs.existsSync(workerPath)) {
      console.error(`[OcrQueue] Worker file not found: ${workerPath}`);
      return;
    }
    
    if (this.restartAttempts === 0) {
      console.log(`[OcrQueue] Starting worker from: ${workerPath}`);
    }

    this.worker = new Worker(workerPath, { execArgv });

    this.worker.on('message', (message: { jobId: string; status: string; error?: string }) => {
      if (message.status === 'error') {
        console.error('[OcrQueue] OCR job failed:', message.error);
      }
      this.restartAttempts = 0; // Reset on successful message
      this.processing = false;
      this.processNext();
    });

    this.worker.on('error', (error) => {
      console.error('[OcrQueue] Worker error:', error.message);
      this.restartAttempts++;
      this.processing = false;
      this.worker = null;
      this.initWorker();
      this.processNext();
    });

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[OcrQueue] Worker exited with code ${code}`);
        this.restartAttempts++;
      } else {
        this.restartAttempts = 0;
      }
      this.processing = false;
      this.worker = null;
      this.initWorker();
      this.processNext();
    });
  }

  private processNext() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    if (!this.worker) {
      this.initWorker();
      if (!this.worker) {
        return;
      }
    }

    const nextJob = this.queue.shift();
    if (!nextJob) {
      return;
    }

    this.processing = true;
    this.worker.postMessage(nextJob);
  }
}

export const ocrQueueService = new OcrQueueService();
