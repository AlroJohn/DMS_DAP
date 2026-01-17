import { parentPort } from 'worker_threads';
import { prisma } from '../lib/prisma';
import { ocrService } from '../services/ocr.service';

type OcrJob = {
  jobId: string;
  documentId: string;
  filePath: string;
  mimeType: string;
  originalName: string;
};

const postResult = (jobId: string, status: 'done' | 'error', error?: string) => {
  if (!parentPort) return;
  parentPort.postMessage({ jobId, status, error });
};

if (!parentPort) {
  process.exit(1);
}

parentPort.on('message', async (job: OcrJob) => {
  try {
    if (job.mimeType !== 'application/pdf') {
      postResult(job.jobId, 'done');
      return;
    }

    const ocrResult = await ocrService.extractTextFromPdf(job.filePath, job.mimeType);
    if (ocrResult) {
      await prisma.oCR_Json.create({
        data: {
          documentDocument_id: job.documentId,
          file_url: job.filePath,
          ocr_json: ocrResult as any,
        },
      });
    }

    postResult(job.jobId, 'done');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown OCR worker error';
    postResult(job.jobId, 'error', message);
  }
});
