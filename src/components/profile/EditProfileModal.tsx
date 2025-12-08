/**
 * Edit Profile Modal Component
 * Allows users to edit their profile information with form validation
 * Includes photo upload functionality
 */

import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/types/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { PhotoUploadSection } from './PhotoUploadSection';

interface EditProfileModalProps {
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<UserProfile>) => Promise<void>;
  loading?: boolean;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  profile,
  isOpen,
  onClose,
  onSave,
  loading = false,
}) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize form data when profile changes or modal opens
  useEffect(() => {
    if (profile && isOpen) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        position: profile.position || '',
        department: profile.department || '',
        phone: profile.phone || '',
        category: profile.category || 'LML Lift Consultants',
        bio: profile.bio || '',
        photo: profile.photo || '',
      });
      setErrors({});
      setSaveMessage(null);
    }
  }, [profile, isOpen]);

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.position?.trim()) {
      newErrors.position = 'Position is required';
    }

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Validate phone format (basic)
    if (formData.phone && !/^\d{10,}|^(\([0-9]{3}\) ?[0-9]{3}-?[0-9]{4})?$/.test(formData.phone.replace(/\D/g, ''))) {
      if (formData.phone.replace(/\D/g, '').length < 10) {
        newErrors.phone = 'Phone must contain at least 10 digits';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  /**
   * Handle category change
   */
  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      category: value as 'LML Lift Consultants' | 'Client' | 'Contractor',
    }));
  };

  /**
   * Handle photo upload
   */
  const handlePhotoChange = (photoUrl: string) => {
    setFormData((prev) => ({
      ...prev,
      photo: photoUrl,
    }));
  };

  /**
   * Handle form submission
   */
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaveMessage(null);
      await onSave(formData);
      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });

      // Close modal after short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Failed to update profile';
      setSaveMessage({ type: 'error', text: errorText });
    }
  };

  if (!profile) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
          {/* Photo Upload Section */}
          <PhotoUploadSection
            currentPhoto={formData.photo}
            onPhotoChange={handlePhotoChange}
            firstName={formData.firstName || ''}
            lastName={formData.lastName || ''}
          />

          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-medium">
              First Name *
            </Label>
            <Input
              id="firstName"
              name="firstName"
              value={formData.firstName || ''}
              onChange={handleInputChange}
              placeholder="John"
              className={errors.firstName ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.firstName && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.firstName}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-medium">
              Last Name *
            </Label>
            <Input
              id="lastName"
              name="lastName"
              value={formData.lastName || ''}
              onChange={handleInputChange}
              placeholder="Smith"
              className={errors.lastName ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.lastName && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.lastName}
              </p>
            )}
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label htmlFor="position" className="text-sm font-medium">
              Position *
            </Label>
            <Input
              id="position"
              name="position"
              value={formData.position || ''}
              onChange={handleInputChange}
              placeholder="Elevator Technician"
              className={errors.position ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.position && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.position}
              </p>
            )}
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="department" className="text-sm font-medium">
              Department
            </Label>
            <Input
              id="department"
              name="department"
              value={formData.department || ''}
              onChange={handleInputChange}
              placeholder="Maintenance"
              disabled={loading}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone
            </Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleInputChange}
              placeholder="(555) 123-4567"
              className={errors.phone ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.phone && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Info about Site Assignment */}
          <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Site assignments are managed by administrators. Contact your admin if you need to be assigned to or removed from sites.
            </p>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md ${
                saveMessage.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {saveMessage.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">{saveMessage.text}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
