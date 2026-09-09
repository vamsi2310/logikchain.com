import { getDownloadURL, ref, uploadBytes, type UploadResult } from "firebase/storage";
import { getBucket } from "@/firebase/app";

/** Read a Storage object. Product images use Product.imageUrl; proofs live under /proofs/{uid}/. */
export async function storageDownloadUrl(objectPath: string): Promise<string> {
  return getDownloadURL(ref(getBucket(), objectPath));
}

export async function uploadProofPhoto(uid: string, file: File, name?: string): Promise<string> {
  const path = `proofs/${uid}/${name ?? `${Date.now()}-${file.name}`}`;
  const result: UploadResult = await uploadBytes(ref(getBucket(), path), file, {
    contentType: file.type || "image/jpeg",
  });
  return getDownloadURL(result.ref);
}

export function resolveImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  return undefined;
}
