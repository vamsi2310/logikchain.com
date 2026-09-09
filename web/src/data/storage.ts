/**
 * Storage helpers for Logikchain web clients.
 * Re-exports the primary storage module in '@/storage' for centralized media management.
 */

export {
  STORAGE_LIMITS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  validateFile,
  uploadFileToPath,
  getStorageDownloadUrl,
  resolveImageUrl,
  uploadProfilePicture,
  deleteProfilePicture,
  uploadProductImage,
  uploadCatalogImage,
  deleteProductImage,
  uploadProofPhoto,
  uploadDocument,
  deleteStorageFile,
} from "@/storage";

// Backward-compatibility alias for storageDownloadUrl
export { getStorageDownloadUrl as storageDownloadUrl } from "@/storage";
