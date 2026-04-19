import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

// Generates a pre-signed URL the browser uploads directly to R2
// The file never passes through your server — much faster and safer
export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET_NAME!,
    Key:         key,
    ContentType: contentType,
  })
  // URL expires in 5 minutes — enough for an upload
  return getSignedUrl(r2, command, { expiresIn: 300 })
}

// Generates a pre-signed URL to view a private photo
export async function getViewUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key:    key,
  })
  // URL expires in 1 hour
  return getSignedUrl(r2, command, { expiresIn: 3600 })
}

// Validates file type before allowing upload
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export function validateFileUpload(contentType: string, sizeBytes: number): string | null {
  if (!ALLOWED_TYPES.includes(contentType)) return 'Only JPEG, PNG and WebP images are allowed'
  if (sizeBytes > MAX_SIZE_BYTES) return 'File must be under 10MB'
  return null
}