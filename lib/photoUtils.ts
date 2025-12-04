import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export interface PhotoUploadResult {
  url: string;
  error: Error | null;
}

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

/**
 * Upload a photo to Supabase storage
 */
export async function uploadPurchasePhoto(
  uri: string,
  userId: string,
  purchaseId: string
): Promise<PhotoUploadResult> {
  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Get file extension
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${purchaseId}/${Date.now()}.${ext}`;

    // Convert base64 to blob for upload
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const blob = base64ToBlob(base64, contentType);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('purchase-photos')
      .upload(fileName, blob, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('purchase-photos')
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    return { url: '', error: error as Error };
  }
}

/**
 * Delete a photo from Supabase storage
 */
export async function deletePurchasePhoto(photoUrl: string): Promise<{ error: Error | null }> {
  try {
    // Extract file path from URL
    const urlParts = photoUrl.split('/purchase-photos/');
    if (urlParts.length < 2) {
      throw new Error('Invalid photo URL');
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('purchase-photos')
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
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}
