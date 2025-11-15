/**
 * Photo Upload Section Component
 * Handles profile photo selection and preview
 * Converts images to data URLs for persistent storage
 */

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Upload, X } from 'lucide-react';

interface PhotoUploadSectionProps {
  currentPhoto?: string;
  onPhotoChange: (photoUrl: string) => void;
  firstName?: string;
  lastName?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const PhotoUploadSection: React.FC<PhotoUploadSectionProps> = ({
  currentPhoto,
  onPhotoChange,
  firstName = '',
  lastName = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentPhoto);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  /**
   * Convert file to data URL for persistent storage
   */
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  /**
   * Validate and process file upload
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset error
    setError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please select a JPEG, PNG, or WebP image');
      return;
    }

    setUploading(true);
    try {
      // Convert to data URL
      const dataUrl = await fileToDataUrl(file);

      // Update preview and callback
      setPreviewUrl(dataUrl);
      onPhotoChange(dataUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload photo';
      setError(errorMessage);
    } finally {
      setUploading(false);
      // Reset file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Handle drag and drop
   */
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-muted');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('bg-muted');
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-muted');

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please select a JPEG, PNG, or WebP image');
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreviewUrl(dataUrl);
      onPhotoChange(dataUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload photo';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Remove photo
   */
  const handleRemovePhoto = () => {
    setPreviewUrl(undefined);
    onPhotoChange('');
    setError(null);
  };

  // Generate initials as fallback
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Profile Photo</Label>

      <div className="flex items-start gap-6">
        {/* Photo Preview */}
        <div className="flex flex-col items-center gap-2">
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Profile preview"
                className="h-24 w-24 rounded-full object-cover border-2 border-muted"
              />
              <button
                onClick={handleRemovePhoto}
                disabled={uploading}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
                title="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/25">
              <span className="text-2xl font-semibold text-muted-foreground">
                {initials || '?'}
              </span>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center max-w-24">
            {previewUrl ? 'Photo set' : 'No photo'}
          </p>
        </div>

        {/* Upload Area */}
        <div className="flex-1">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 transition-colors hover:bg-muted/50 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-2 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, or WebP up to 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 rounded-md text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Help Text */}
          <p className="text-xs text-muted-foreground mt-3">
            Your photo will be stored securely with your profile.
          </p>
        </div>
      </div>
    </div>
  );
};
