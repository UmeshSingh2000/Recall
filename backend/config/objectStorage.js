import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const bucket = process.env.OBJECT_STORAGE_BUCKET;

if (!bucket) {
  throw new Error("Object storage bucket is missing");
}

const s3 = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION,
  forcePathStyle: true,
});

export async function uploadTicketImage(file, ticketId) {
  const filename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `tickets/${ticketId}/${randomUUID()}-${filename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 3600 },
  );
}

export async function deleteTicketImageObject(imageUrl, ticketId) {
  const pathParts = decodeURIComponent(new URL(imageUrl).pathname)
    .split("/")
    .filter(Boolean);
  const ticketsIndex = pathParts.indexOf("tickets");
  const key = ticketsIndex === -1 ? "" : pathParts.slice(ticketsIndex).join("/");

  if (!key.startsWith(`tickets/${ticketId}/`)) {
    throw new Error("Invalid ticket image location");
  }

  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
