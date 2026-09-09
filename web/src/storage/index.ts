import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTaskSnapshot,
} from "firebase/storage";
import { getBucket } from "@/firebase/app";
import type {
  DocumentCategory,
  FileValidationOptions,
  StorageUploadProgress,
} from "@/types/domain";

/** Default size limits (in MB) according to storage.rules */
export const STORAGE_LIMITS = {
  PROFILE_PICTURE_MB: 5,
  PRODUCT_IMAGE_MB: 10,
  PROOF_PHOTO_MB: 8,
  DOCUMENT_MB: 15,
} as const;

/** Allowed MIME types */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export const ALLOWED_DOCUMENT_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
];

/**
 * Validates a file against size and MIME type criteria.
 * Throws an Error with a descriptive message if invalid.
 */
export function validateFile(file: File, options: FileValidationOptions): void {
  const { maxSizeMb, allowedTypes } = options;

  if (maxSizeMb && file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(
      `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of ${maxSizeMb} MB.`
    );
  }

  if (allowedTypes && allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some((type) => {
      if (type.endsWith("/*")) {
        const prefix = type.slice(0, -2);
        return file.type.startsWith(prefix);
      }
      return file.type === type;
    });

    if (!isAllowed) {
      throw new Error(
        `File type "${file.type || "unknown"}" is not permitted. Allowed types: ${allowedTypes.join(", ")}`
      );
    }
  }
}

/**
 * Sanitize filename to prevent directory traversal or invalid characters.
 */
function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Uploads a file to a specified Storage path with resumable upload and progress reporting.
 */
export async function uploadFileToPath(
  path: string,
  file: File,
  onProgress?: (progress: StorageUploadProgress) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  const storageRef = ref(getBucket(), path);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type || "application/octet-stream",
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot: UploadTaskSnapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          onProgress({
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            progressPercentage: Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            ),
          });
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadUrl, storagePath: path });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Resolves an object path to its public download URL.
 */
export async function getStorageDownloadUrl(objectPath: string): Promise<string> {
  return getDownloadURL(ref(getBucket(), objectPath));
}

/**
 * Resolve external URL or data URI, returning undefined if empty.
 */
export function resolveImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// 1. Profile Pictures (Avatars)
// ---------------------------------------------------------------------------

/**
 * Upload a user profile picture to /profiles/{userId}/{timestamp}-{filename}.
 * Enforces image validation (max 5 MB).
 */
export async function uploadProfilePicture(
  userId: string,
  file: File,
  onProgress?: (progress: StorageUploadProgress) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  validateFile(file, {
    maxSizeMb: STORAGE_LIMITS.PROFILE_PICTURE_MB,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  });

  const sanitized = sanitizeFileName(file.name);
  const path = `profiles/${userId}/${Date.now()}-${sanitized}`;
  return uploadFileToPath(path, file, onProgress);
}

/**
 * Delete a profile picture from Storage.
 */
export async function deleteProfilePicture(storagePathOrUrl: string): Promise<void> {
  return deleteStorageFile(storagePathOrUrl);
}

// ---------------------------------------------------------------------------
// 2. Product Inventory Pictures & Catalog
// ---------------------------------------------------------------------------

/**
 * Upload a product picture to /products/{supplierId}/{productId}/{timestamp}-{filename}.
 * Enforces image validation (max 10 MB).
 */
export async function uploadProductImage(
  supplierId: string,
  productId: string,
  file: File,
  onProgress?: (progress: StorageUploadProgress) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  validateFile(file, {
    maxSizeMb: STORAGE_LIMITS.PRODUCT_IMAGE_MB,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  });

  const sanitized = sanitizeFileName(file.name);
  const path = `products/${supplierId}/${productId}/${Date.now()}-${sanitized}`;
  return uploadFileToPath(path, file, onProgress);
}

/**
 * Upload a catalog / pamphlet banner or promotional artwork.
 * Path: /products/{supplierId}/catalog/{timestamp}-{filename}.
 */
export async function uploadCatalogImage(
  supplierId: string,
  file: File,
  onProgress?: (progress: StorageUploadProgress) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  validateFile(file, {
    maxSizeMb: STORAGE_LIMITS.PRODUCT_IMAGE_MB,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  });

  const sanitized = sanitizeFileName(file.name);
  const path = `products/${supplierId}/catalog/${Date.now()}-${sanitized}`;
  return uploadFileToPath(path, file, onProgress);
}

/**
 * Delete a product picture from Storage.
 */
export async function deleteProductImage(storagePathOrUrl: string): Promise<void> {
  return deleteStorageFile(storagePathOrUrl);
}

// ---------------------------------------------------------------------------
// 3. Proof Photos (Delivery, Handover, Arrival)
// ---------------------------------------------------------------------------

/**
 * Upload a delivery or handover proof photo to /proofs/{userId}/{filename}.
 * Returns the download URL (maintaining backward compatibility with existing code).
 */
export async function uploadProofPhoto(
  userId: string,
  file: File,
  name?: string
): Promise<string> {
  validateFile(file, {
    maxSizeMb: STORAGE_LIMITS.PROOF_PHOTO_MB,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  });

  const sanitized = sanitizeFileName(name ?? `${Date.now()}-${file.name}`);
  const path = `proofs/${userId}/${sanitized}`;
  const result = await uploadFileToPath(path, file);
  return result.downloadUrl;
}

// ---------------------------------------------------------------------------
// 4. Verification & Statutory Documents (KYC, PAN, GSTIN, RC, Tax)
// ---------------------------------------------------------------------------

/**
 * Upload an official document to /documents/{userId}/{category}/{timestamp}-{filename}.
 * Allows images and PDFs up to 15 MB.
 */
export async function uploadDocument(
  userId: string,
  file: File,
  category: DocumentCategory = "other",
  onProgress?: (progress: StorageUploadProgress) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  validateFile(file, {
    maxSizeMb: STORAGE_LIMITS.DOCUMENT_MB,
    allowedTypes: ALLOWED_DOCUMENT_TYPES,
  });

  const sanitized = sanitizeFileName(file.name);
  const path = `documents/${userId}/${category}/${Date.now()}-${sanitized}`;
  return uploadFileToPath(path, file, onProgress);
}

// ---------------------------------------------------------------------------
// 5. File Deletion
// ---------------------------------------------------------------------------

/**
 * Deletes an object from Firebase Storage using its path or gs:// / download URL.
 */
export async function deleteStorageFile(storagePathOrUrl: string): Promise<void> {
  if (!storagePathOrUrl) return;

  let storageRef;
  if (
    storagePathOrUrl.startsWith("http://") ||
    storagePathOrUrl.startsWith("https://") ||
    storagePathOrUrl.startsWith("gs://")
  ) {
    // If it's a full URL, ref() can parse it if from the same bucket
    storageRef = ref(getBucket(), storagePathOrUrl);
  } else {
    // It's a relative path within our bucket
    storageRef = ref(getBucket(), storagePathOrUrl);
  }

  await deleteObject(storageRef);
}
