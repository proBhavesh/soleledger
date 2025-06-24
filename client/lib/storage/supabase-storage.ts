import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// Initialize S3 client for Supabase Storage
const s3Client = new S3Client({
  forcePathStyle: true,
  region: process.env.STORAGE_REGION!,
  endpoint: process.env.STORAGE_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.STORAGE_ACCESS_KEY_SECRET!,
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
  const fileKey = `${userId}/${Date.now()}-${randomUUID()}.${fileExtension}`;

  // Get bucket name from environment
  const bucket = process.env.STORAGE_BUCKET_NAME!;

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

  // Construct the final file URL for Supabase Storage
  const projectRef = process.env.STORAGE_ENDPOINT!.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const fileUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket}/${fileKey}`;

  return {
    uploadUrl,
    fileKey,
    fileUrl,
  };
}

/**
 * Get the public URL for a file in Supabase Storage
 */
export function getS3FileUrl(bucket: string, key: string): string {
  const projectRef = process.env.STORAGE_ENDPOINT!.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket}/${key}`;
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

/**
 * Upload a file directly to Supabase Storage
 */
export async function uploadFile(
  file: File,
  fileKey: string,
  bucket: string = "receipts"
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  try {
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Get the public URL
    const fileUrl = getS3FileUrl(bucket, fileKey);

    return {
      success: true,
      fileUrl,
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    return {
      success: false,
      error: "Failed to upload file",
    };
  }
}
