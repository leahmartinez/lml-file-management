/**
 * Edit External Contact Modal Component
 * Allows admins/consultants to edit external contacts
 */

import React, { useState, useEffect } from 'react';
import { DirectoryContact } from '@/types/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle, Loader2, Trash2 } from 'lucide-react';

interface EditExternalContactModalProps {
  contact: DirectoryContact | null;
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onUpdate?: (id: string, updates: Partial<DirectoryContact>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const EditExternalContactModal: React.FC<EditExternalContactModalProps> = ({
  contact,
  isOpen,
  onClose,
  categories,
  onUpdate,
  onDelete,
}) => {
  const [formData, setFormData] = useState<Partial<DirectoryContact>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /**
   * Initialize form data when contact changes
   */
  useEffect(() => {
    if (contact && isOpen) {
      setFormData({
        firstName: contact.firstName,
        lastName: contact.lastName,
        position: contact.position,
        email: contact.email,
        phone: contact.phone,
        category: contact.category,
        photo: contact.photo,
      });
      setErrors({});
      setMessage(null);
    }
  }, [contact, isOpen]);

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
    if (!formData.category?.trim()) {
      newErrors.category = 'Category is required';
    }

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
    if (errors.category) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.category;
        return newErrors;
      });
    }
  };

  /**
   * Handle photo upload
   */
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({ ...prev, photo: 'Please select a valid image file' }));
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, photo: 'Image size must be less than 2MB' }));
        return;
      }

      // Read file as Data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setFormData((prev) => ({
          ...prev,
          photo: dataUrl,
        }));
        // Clear photo error if exists
        if (errors.photo) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.photo;
            return newErrors;
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Handle form submission
   */
  const handleUpdate = async () => {
    if (!validateForm() || !contact) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (onUpdate) {
        await onUpdate(contact.id, formData);
      }

      setMessage({
        type: 'success',
        text: 'Contact updated successfully',
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Failed to update contact';
      setMessage({ type: 'error', text: errorText });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle contact deletion
   */
  const handleDelete = async () => {
    if (!contact) return;

    if (!window.confirm(`Are you sure you want to delete ${contact.firstName} ${contact.lastName}?`)) {
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      if (onDelete) {
        await onDelete(contact.id);
      }

      setMessage({
        type: 'success',
        text: 'Contact deleted successfully',
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Failed to delete contact';
      setMessage({ type: 'error', text: errorText });
    } finally {
      setDeleting(false);
    }
  };

  if (!contact) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit External Contact</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
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
              placeholder="Robert"
              className={errors.firstName ? 'border-red-500' : ''}
              disabled={loading || deleting}
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
              placeholder="Williams"
              className={errors.lastName ? 'border-red-500' : ''}
              disabled={loading || deleting}
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
              placeholder="KONE Service Manager"
              className={errors.position ? 'border-red-500' : ''}
              disabled={loading || deleting}
            />
            {errors.position && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.position}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleInputChange}
              placeholder="robert.williams@kone.com"
              className={errors.email ? 'border-red-500' : ''}
              disabled={loading || deleting}
            />
            {errors.email && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.email}
              </p>
            )}
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
              placeholder="(555) 567-8901"
              disabled={loading || deleting}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Category *
            </Label>
            <Select value={formData.category || ''} onValueChange={handleCategoryChange}>
              <SelectTrigger
                disabled={loading || deleting}
                className={errors.category ? 'border-red-500' : ''}
              >
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.category}
              </p>
            )}
          </div>

          {/* Profile Photo */}
          <div className="space-y-2">
            <Label htmlFor="photo" className="text-sm font-medium">
              Profile Photo
            </Label>
            <div className="flex items-center gap-4">
              {formData.photo && (
                <div className="relative">
                  <img
                    src={formData.photo}
                    alt="Profile preview"
                    className="h-16 w-16 rounded-full object-cover border-2 border-border"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, photo: '' }))}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    disabled={loading || deleting}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              )}
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className={errors.photo ? 'border-red-500' : ''}
                disabled={loading || deleting}
              />
            </div>
            {errors.photo && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.photo}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Upload an image (max 2MB). Recommended: square image, at least 200x200px.
            </p>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || deleting}
            className="gap-2"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>

          <Button variant="outline" onClick={onClose} disabled={loading || deleting}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={loading || deleting} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Updating...' : 'Update Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
