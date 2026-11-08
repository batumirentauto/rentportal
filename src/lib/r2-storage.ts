import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getMimeType } from "./storage";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string;
}

export function getR2Config(): R2Config | null {
  const accountId = (
    process.env.R2_ACCOUNT_ID ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    "da477cd13efde6828130d3dda3258ecc"
  ).trim();

  const accessKeyId = (
    process.env.R2_ACCESS_KEY_ID ||
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    "6ad788299703240b71f44a01c8ea9e6b"
  ).trim();

  const secretAccessKey = (
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    "dd99bfeea375101d57879ed33c62c46b64ea874e1996750d80f2d27b456d6044"
  ).trim();

  const bucketName = (
    process.env.R2_BUCKET_NAME ||
    process.env.CLOUDFLARE_R2_BUCKET_NAME ||
    "batumirentauto"
  ).trim();

  const publicUrl = (
    process.env.R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    "https://pub-47404ccc042d427ba59fe020462acd9d.r2.dev"
  ).trim().replace(/\/$/, "");

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
  };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

let cachedS3Client: S3Client | null = null;
let lastClientKey = "";

function getS3Client(config: R2Config): S3Client {
  const clientKey = `${config.accountId}:${config.accessKeyId}`;
  if (cachedS3Client && lastClientKey === clientKey) {
    return cachedS3Client;
  }

  cachedS3Client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  lastClientKey = clientKey;

  return cachedS3Client;
}

/**
 * Uploads a file buffer directly to Cloudflare R2 bucket.
 * Returns the public URL to view or download the file.
 */
export async function uploadToR2(
  buffer: Buffer,
  folder: string,
  fileName: string,
  customMimeType?: string
): Promise<string> {
  const config = getR2Config();
  if (!config) {
    throw new Error("Cloudflare R2 credentials (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) are not configured");
  }

  const s3 = getS3Client(config);
  const mimeType = customMimeType || getMimeType(fileName);
  const key = `${folder}/${fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  if (config.publicUrl) {
    return `${config.publicUrl}/${key}`;
  }

  // If public URL not specified, return standard R2 dev or custom domain URL
  return `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${key}`;
}
