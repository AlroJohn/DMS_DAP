import { parentPort } from 'worker_threads';
import { prisma } from '../lib/prisma';
import { ocrService } from '../services/ocr.service';
import { s3Storage } from '../services/storage/s3.service';

type OcrJob = {
  jobId: string;
  documentId: string;
  storagePath: string;
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

    const fileBuffer = await s3Storage.getObjectBuffer(job.storagePath);
    const ocrResult = await ocrService.extractTextFromPdfBuffer(
      fileBuffer,
      job.mimeType,
      job.storagePath
    );
    if (ocrResult) {
      await prisma.oCR_Json.create({
        data: {
          documentDocument_id: job.documentId,
          file_url: job.storagePath,
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
