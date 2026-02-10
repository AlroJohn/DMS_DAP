import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

const S3_URI_PREFIX = 's3://';

type S3Location = {
  bucket: string;
  key: string;
};

const buildS3Uri = (bucket: string, key: string) => `${S3_URI_PREFIX}${bucket}/${key}`;

const parseS3Uri = (uri: string): S3Location | null => {
  if (!uri.startsWith(S3_URI_PREFIX)) {
    return null;
  }

  const remainder = uri.slice(S3_URI_PREFIX.length);
  const firstSlash = remainder.indexOf('/');
  if (firstSlash === -1) {
    return null;
  }

  const bucket = remainder.slice(0, firstSlash);
  const key = remainder.slice(firstSlash + 1);
  if (!bucket || !key) {
    return null;
  }

  return { bucket, key };
};

const getEnv = (key: string) => process.env[key];

class S3StorageService {
  private client: S3Client | null = null;
  private isEnabled: boolean;
  private localBasePath: string;

  constructor() {
    this.localBasePath = path.resolve(process.cwd(), 'uploads', 'documents');
    this.isEnabled = false;
    this.refreshConfig();
  }

  private refreshConfig(): void {
    const region = getEnv('AWS_REGION') || getEnv('AWS_DEFAULT_REGION');
    const bucket = getEnv('S3_BUCKET_NAME');
    const accessKeyId = getEnv('AWS_ACCESS_KEY_ID');
    const secretAccessKey = getEnv('AWS_SECRET_ACCESS_KEY');
    const canEnable = Boolean(region && bucket);

    if (!canEnable) {
      if (this.isEnabled) {
        console.warn('S3 storage is no longer configured. Falling back to local storage.');
      } else {
        console.warn('S3 storage is not configured. Using alternative storage method.');
      }
      this.isEnabled = false;
      this.client = null;
      return;
    }

    if (!this.isEnabled || !this.client) {
      this.client = new S3Client({
        region: region!,
        credentials: accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
      });
    }
    this.isEnabled = true;
  }

  private ensureEnabled(): void {
    this.refreshConfig();
    if (!this.isEnabled || !this.client) {
      throw new Error('S3 storage is not enabled or properly configured.');
    }
  }

  getBucket(): string {
    const bucket = getEnv('S3_BUCKET_NAME');
    if (!bucket) {
      throw new Error('S3_BUCKET_NAME is required for S3 storage.');
    }
    return bucket;
  }

  buildUri(key: string): string {
    return buildS3Uri(this.getBucket(), key);
  }

  async uploadBuffer(params: {
    key: string;
    body: Buffer;
    contentType?: string;
  }): Promise<string> {
    this.refreshConfig();
    if (this.isEnabled && this.client) {
      const bucket = this.getBucket();
      await this.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: params.key,
          Body: params.body,
          ContentType: params.contentType,
        })
      );
      return buildS3Uri(bucket, params.key);
    }

    const targetPath = path.resolve(this.localBasePath, params.key);
    if (!targetPath.startsWith(this.localBasePath)) {
      throw new Error('Invalid storage path');
    }
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, params.body);
    return targetPath;
  }

  async getObjectStream(uriOrKey: string): Promise<Readable> {
    this.ensureEnabled();
    if (!this.client) {
      throw new Error('S3 client not initialized');
    }
    
    const location = parseS3Uri(uriOrKey) || {
      bucket: this.getBucket(),
      key: uriOrKey,
    };

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: location.bucket,
        Key: location.key,
      })
    );

    const body = response.Body;
    if (!body) {
      throw new Error('S3 object body is empty.');
    }

    return body as Readable;
  }

  async getObjectBuffer(uriOrKey: string): Promise<Buffer> {
    const stream = await this.getObjectStream(uriOrKey);
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  async deleteObject(uriOrKey: string): Promise<void> {
    this.ensureEnabled();
    if (!this.client) {
      throw new Error('S3 client not initialized');
    }
    
    const location = parseS3Uri(uriOrKey) || {
      bucket: this.getBucket(),
      key: uriOrKey,
    };

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: location.bucket,
        Key: location.key,
      })
    );
  }
}

// Export S3 storage service instance
export const s3Storage = new S3StorageService();
export { S3_URI_PREFIX, buildS3Uri, parseS3Uri };
