/**
 * Business Management Modal Component
 * Allows admins to add, edit, and delete business records
 */

import React, { useState, useEffect } from 'react';
import { Business } from '@/types/data';
import { useAuth } from '@/hooks/useAuth';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle, Loader2, Trash2 } from 'lucide-react';

interface BusinessManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  business?: Business | null; // If provided, component is in edit mode
  onSave?: (business: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

type ProjectState = 'Victoria' | 'NSW' | 'South Australia' | 'Queensland';

export const BusinessManagementModal: React.FC<BusinessManagementModalProps> = ({
  isOpen,
  onClose,
  business,
  onSave,
  onDelete,
}) => {
  const { user } = useAuth();
  const isEditMode = !!business;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    postcode: '',
    state: '' as ProjectState | '',
    website: '',
    phone: '',
    email: '',
    category: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form with business data when editing
  useEffect(() => {
    if (isEditMode && business) {
      setFormData({
        name: business.name,
        description: business.description || '',
        address: business.address || '',
        city: business.city || '',
        postcode: business.postcode || '',
        state: business.state || '',
        website: business.website || '',
        phone: business.phone || '',
        email: business.email || '',
        category: business.category || '',
      });
      setMessage(null);
    } else {
      // Reset form for new business
      setFormData({
        name: '',
        description: '',
        address: '',
        city: '',
        postcode: '',
        state: '',
        website: '',
        phone: '',
        email: '',
        category: '',
      });
      setMessage(null);
    }
    setErrors({});
  }, [isEditMode, business, isOpen]);

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Business name is required';
    }

    // At least one contact method (phone or email)
    if (!formData.phone && !formData.email) {
      newErrors.contact = 'At least a phone number or email is required';
    }

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Validate website format if provided
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://';
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
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  /**
   * Handle select change
   */
  const handleSelectChange = (value: string, field: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const businessData: Omit<Business, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        description: formData.description || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        postcode: formData.postcode || undefined,
        state: formData.state ? (formData.state as ProjectState) : undefined,
        website: formData.website || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        category: formData.category || undefined,
        createdBy: user?.email || 'unknown',
      };

      if (onSave) {
        await onSave(businessData);
      }

      setMessage({
        type: 'success',
        text: isEditMode ? 'Business updated successfully!' : 'Business created successfully!',
      });

      // Close modal after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setMessage({
        type: 'error',
        text: `Failed to ${isEditMode ? 'update' : 'create'} business: ${errorMessage}`,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle delete
   */
  const handleDelete = async () => {
    if (!business) return;

    setDeleteLoading(true);
    setMessage(null);

    try {
      if (onDelete) {
        await onDelete(business.id);
      }

      setMessage({
        type: 'success',
        text: 'Business deleted successfully!',
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setMessage({
        type: 'error',
        text: `Failed to delete business: ${errorMessage}`,
      });
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Business' : 'Add New Business'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Message */}
            {message && (
              <div
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Basic Information</h3>

              <div>
                <Label htmlFor="name">Business Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., ABC Building Services"
                  className={errors.name ? 'border-red-500' : ''}
                  disabled={loading}
                />
                {errors.name && (
                  <span className="text-sm text-red-600">{errors.name}</span>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Business description or notes..."
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleSelectChange(value, 'category')}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Client">Client</SelectItem>
                    <SelectItem value="Supplier">Supplier</SelectItem>
                    <SelectItem value="Contractor">Contractor</SelectItem>
                    <SelectItem value="Partner">Partner</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Address</h3>

              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Street address"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleInputChange}
                    placeholder="Postcode"
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => handleSelectChange(value, 'state')}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Victoria">Victoria</SelectItem>
                      <SelectItem value="NSW">NSW</SelectItem>
                      <SelectItem value="South Australia">South Australia</SelectItem>
                      <SelectItem value="Queensland">Queensland</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Contact Information</h3>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="contact@example.com"
                  className={errors.email ? 'border-red-500' : ''}
                  disabled={loading}
                />
                {errors.email && (
                  <span className="text-sm text-red-600">{errors.email}</span>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Phone number"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://www.example.com"
                  className={errors.website ? 'border-red-500' : ''}
                  disabled={loading}
                />
                {errors.website && (
                  <span className="text-sm text-red-600">{errors.website}</span>
                )}
              </div>

              {errors.contact && (
                <div className="text-sm text-red-600 -mt-2">{errors.contact}</div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            {isEditMode && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading || deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading || deleteLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || deleteLoading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Business' : 'Create Business'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Business</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-4">
              Are you sure you want to delete <strong>{formData.name}</strong>?
              This action cannot be undone. Any contacts linked to this business will keep their reference to it.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
