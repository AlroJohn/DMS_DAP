import path from 'path';
import { Worker } from 'worker_threads';

type OcrJob = {
  jobId: string;
  documentId: string;
  filePath: string;
  mimeType: string;
  originalName: string;
};

class OcrQueueService {
  private worker: Worker | null = null;
  private queue: OcrJob[] = [];
  private processing = false;

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

    const isProd = process.env.NODE_ENV === 'production';
    const workerPath = isProd
      ? path.join(__dirname, '..', 'workers', 'ocr.worker.js')
      : path.join(process.cwd(), 'src', 'workers', 'ocr.worker.ts');
    const execArgv = isProd ? [] : ['-r', 'tsx/cjs'];

    this.worker = new Worker(workerPath, { execArgv });

    this.worker.on('message', (message: { jobId: string; status: string; error?: string }) => {
      if (message.status === 'error') {
        console.error('[OcrQueue] OCR job failed:', message.error);
      }
      this.processing = false;
      this.processNext();
    });

    this.worker.on('error', (error) => {
      console.error('[OcrQueue] Worker error:', error);
      this.processing = false;
      this.worker = null;
      this.initWorker();
      this.processNext();
    });

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[OcrQueue] Worker exited with code ${code}. Restarting.`);
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
