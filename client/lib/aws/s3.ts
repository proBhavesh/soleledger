import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  fileUrl: string;
}

/**
 * Generate a presigned URL for file upload to S3
 */
export async function generatePresignedUrl(
  fileName: string,
  fileType: string,
  userId: string
): Promise<PresignedUrlResponse> {
  // Generate unique file key with user ID and timestamp
  const fileExtension = fileName.split(".").pop();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileKey = `receipts/${userId}/${Date.now()}-${randomUUID()}.${fileExtension}`;

  const bucket = process.env.AWS_S3_BUCKET!;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileKey,
    ContentType: fileType,
    Metadata: {
      "original-filename": sanitizedFileName,
      "uploaded-by": userId,
    },
  });

  // Generate presigned URL valid for 5 minutes
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

  // Construct the final file URL
  const fileUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

  return {
    uploadUrl,
    fileKey,
    fileUrl,
  };
}

/**
 * Get the public URL for a file in S3
 */
export function getS3FileUrl(bucket: string, key: string): string {
  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Validate file type for receipts/documents
 */
export function validateFileType(mimeType: string): boolean {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  return allowedTypes.includes(mimeType);
}

/**
 * Validate file size (max 10MB)
 */
export function validateFileSize(size: number): boolean {
  const maxSize = 10 * 1024 * 1024; // 10MB
  return size <= maxSize;
}
