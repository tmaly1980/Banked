import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export interface FileUploadResult {
  url: string;
  error: Error | null;
}

// Backwards compatibility alias
export type PhotoUploadResult = FileUploadResult;

/**
 * Request camera roll permissions
 */
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Pick an image from the media library
 */
export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const hasPermission = await requestMediaLibraryPermissions();
  if (!hasPermission) {
    throw new Error('Media library permission denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
    aspect: [4, 3],
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0];
}

/**
 * Take a photo with the camera
 */
export async function takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
  const hasPermission = await requestCameraPermissions();
  if (!hasPermission) {
    throw new Error('Camera permission denied');
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.8,
    aspect: [4, 3],
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0];
}

export async function uriToFile(uri: string): Promise<Uint8Array> {
    try {
      // Use fetch to read the file as ArrayBuffer
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error('[FileUploadService] Error converting URI to file:', error);
      throw error;
    }
  }

/**
 * Generic file upload function to Supabase storage
 * Centralized function for all file uploads using modern FileSystem API
 * @param uri - File URI to upload
 * @param bucket - Supabase storage bucket name
 * @param filePath - Path within the bucket (e.g., 'userId/purchaseId/filename.ext')
 * @param contentType - Optional MIME type, will be inferred from extension if not provided
 */
export async function uploadFile(
  uri: string,
  bucket: string,
  filePath: string,
  contentType?: string
): Promise<FileUploadResult> {
  try {
    // Convert URI to Uint8Array using fetch
    const fileData = await uriToFile(uri);

    // Verify file has content
    if (!fileData || fileData.length === 0) {
      throw new Error('File is empty or could not be read');
    }

    // Infer content type from file extension if not provided
    let mimeType = contentType;
    if (!mimeType) {
      const ext = uri.split('.').pop()?.toLowerCase() || '';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      } else if (['pdf'].includes(ext)) {
        mimeType = 'application/pdf';
      } else if (['mp4', 'mov'].includes(ext)) {
        mimeType = `video/${ext}`;
      } else {
        mimeType = 'application/octet-stream';
      }
    }

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileData, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    return { url: '', error: error as Error };
  }
}

/**
 * Upload a photo to Supabase storage (wrapper for uploadFile)
 * @deprecated Use uploadFile for more flexibility
 */
export async function uploadPurchasePhoto(
  uri: string,
  userId: string,
  purchaseId: string
): Promise<PhotoUploadResult> {
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${userId}/${purchaseId}/${Date.now()}.${ext}`;
  return uploadFile(uri, 'purchase-photos', fileName);
}

/**
 * Generic file deletion from Supabase storage
 * @param fileUrl - Full URL of the file to delete
 * @param bucket - Supabase storage bucket name
 */
export async function deleteFile(fileUrl: string, bucket: string): Promise<{ error: Error | null }> {
  try {
    // Extract file path from URL
    const urlParts = fileUrl.split(`/${bucket}/`);
    if (urlParts.length < 2) {
      throw new Error(`Invalid file URL for bucket: ${bucket}`);
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Delete a photo from Supabase storage (wrapper for deleteFile)
 * @deprecated Use deleteFile for more flexibility
 */
export async function deletePurchasePhoto(photoUrl: string): Promise<{ error: Error | null }> {
  return deleteFile(photoUrl, 'purchase-photos');
}
