import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export function createR2Client(params: {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
}) {
  return new S3Client({
    region: 'auto',
    endpoint: params.endpoint,
    credentials: {
      accessKeyId: params.accessKeyId,
      secretAccessKey: params.secretAccessKey,
    },
  })
}

export async function presignPutUrl(
  s3: S3Client,
  input: { bucket: string; key: string; contentType?: string; contentLength?: number },
) {
  const cmd = new PutObjectCommand({
    Bucket: input.bucket,
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
  })
  return getSignedUrl(s3, cmd, { expiresIn: 60 * 10 })
}

export async function presignGetUrl(s3: S3Client, input: { bucket: string; key: string }) {
  const cmd = new GetObjectCommand({ Bucket: input.bucket, Key: input.key })
  return getSignedUrl(s3, cmd, { expiresIn: 60 * 10 })
}

