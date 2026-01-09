/**
 * Add External Contact Modal Component
 * Allows admins/consultants to manually add external contacts
 * Used for people who don't have user accounts
 */

import React, { useState, useEffect } from 'react';
import { ExternalContact } from '@/types/data';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Business } from '@/types/data';

interface AddExternalContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  contact?: ExternalContact | null;
  businesses?: Business[];
  unattachedContacts?: ExternalContact[];
  businessId?: string | null;
  onAdd?: (contact: Omit<ExternalContact, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdate?: (id: string, updates: Partial<ExternalContact>) => Promise<void>;
  onAssignContact?: (contactId: string, businessId: string) => Promise<void>;
}

export const AddExternalContactModal: React.FC<AddExternalContactModalProps> = ({
  isOpen,
  onClose,
  categories,
  contact,
  businesses = [],
  unattachedContacts = [],
  businessId,
  onAdd,
  onUpdate,
  onAssignContact,
}) => {
  const { user } = useAuth();
  const isEditing = !!contact;
  const isAssigningToBusinessOnly = businessId && !isEditing && unattachedContacts.length > 0;

  const [mode, setMode] = useState<'new' | 'assign'>('new');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [searchContactQuery, setSearchContactQuery] = useState<string>('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    position: '',
    businessId: '',
    customBusiness: '',
    email: '',
    phone: '',
    category: '',
  });

  // Populate form with contact data when editing
  useEffect(() => {
    if (isEditing && contact) {
      setFormData({
        firstName: contact.firstName,
        lastName: contact.lastName,
        position: contact.position,
        businessId: contact.businessId || '',
        customBusiness: contact.company || '',
        email: contact.email || '',
        phone: contact.phone || '',
        category: contact.category || '',
      });
      setMode('new');
    } else if (businessId && !isEditing) {
      // When adding to a business
      setFormData({
        firstName: '',
        lastName: '',
        position: '',
        businessId: businessId,
        customBusiness: '',
        email: '',
        phone: '',
        category: '',
      });
      setMode(unattachedContacts.length > 0 ? 'assign' : 'new');
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        position: '',
        businessId: '',
        customBusiness: '',
        email: '',
        phone: '',
        category: '',
      });
      setMode('new');
    }
    setSelectedContactId('');
    setSearchContactQuery('');
    setErrors({});
    setMessage(null);
  }, [contact, isEditing, isOpen, businessId, unattachedContacts.length]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.position.trim()) {
      newErrors.position = 'Position is required';
    }
    if (!formData.category) {
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
  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      category: value,
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
   * Handle form submission
   */
  const handleSubmit = async () => {
    // Validate for assign mode
    if (mode === 'assign' && !selectedContactId) {
      setMessage({ type: 'error', text: 'Please select a contact to assign' });
      return;
    }

    if (mode === 'new' && !validateForm()) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'assign' && selectedContactId && businessId) {
        // Assign existing contact to business
        if (onAssignContact) {
          await onAssignContact(selectedContactId, businessId);
        }

        const selectedContact = unattachedContacts.find(c => c.id === selectedContactId);
        setMessage({
          type: 'success',
          text: `${selectedContact?.firstName} ${selectedContact?.lastName} has been assigned to the business`,
        });
      } else if (isEditing && contact) {
        // Update existing contact
        const selectedBusiness = formData.businessId ? businesses.find(b => b.id === formData.businessId) : null;
        const updates: Partial<ExternalContact> = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          position: formData.position,
          businessId: formData.businessId || undefined,
          company: formData.customBusiness || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          category: formData.category as 'LML Lift Consultants' | 'Client' | 'Contractor',
        };

        if (onUpdate) {
          await onUpdate(contact.id, updates);
        }

        setMessage({
          type: 'success',
          text: `${formData.firstName} ${formData.lastName} has been updated`,
        });
      } else {
        // Create new contact
        const contactData: Omit<ExternalContact, 'id' | 'createdAt' | 'updatedAt'> = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          position: formData.position,
          businessId: formData.businessId || undefined,
          company: formData.customBusiness || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          category: formData.category as 'LML Lift Consultants' | 'Client' | 'Contractor',
          createdBy: user?.email || 'unknown',
        };

        if (onAdd) {
          await onAdd(contactData);
        }

        setMessage({
          type: 'success',
          text: `${formData.firstName} ${formData.lastName} has been added to the directory`,
        });
      }

      // Reset form and close after delay
      setTimeout(() => {
        setFormData({
          firstName: '',
          lastName: '',
          position: '',
          businessId: '',
          customBusiness: '',
          email: '',
          phone: '',
          category: '',
        });
        setSelectedContactId('');
        setSearchContactQuery('');
        setErrors({});
        setMessage(null);
        onClose();
      }, 1500);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : isEditing ? 'Failed to update contact' : 'Failed to add contact';
      setMessage({ type: 'error', text: errorText });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        firstName: '',
        lastName: '',
        position: '',
        businessId: '',
        customBusiness: '',
        email: '',
        phone: '',
        category: '',
      });
      setSelectedContactId('');
      setSearchContactQuery('');
      setErrors({});
      setMessage(null);
      onClose();
    }
  };

  const handleBusinessSelect = (value: string) => {
    setFormData(prev => ({ ...prev, businessId: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? 'Edit External Contact'
              : mode === 'assign'
              ? 'Assign Contact to Business'
              : 'Add External Contact'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          {/* Mode Toggle (only when adding to business with unattached contacts) */}
          {isAssigningToBusinessOnly && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">What would you like to do?</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === 'new' ? 'default' : 'outline'}
                  onClick={() => {
                    setMode('new');
                    setSearchContactQuery('');
                  }}
                  className="flex-1"
                  size="sm"
                >
                  Create New Contact
                </Button>
                <Button
                  type="button"
                  variant={mode === 'assign' ? 'default' : 'outline'}
                  onClick={() => {
                    setMode('assign');
                    setSearchContactQuery('');
                  }}
                  className="flex-1"
                  size="sm"
                >
                  Assign Existing Contact
                </Button>
              </div>
            </div>
          )}

          {/* Assign Existing Contact Section */}
          {mode === 'assign' && (
            <div className="space-y-2 relative">
              <Label htmlFor="searchContact" className="text-sm font-medium">
                Search Contact to Assign *
              </Label>
              <Input
                id="searchContact"
                placeholder="Search by name or position..."
                value={searchContactQuery}
                onChange={(e) => setSearchContactQuery(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />

              {/* Auto-suggest dropdown */}
              {searchContactQuery && (
                <div className="absolute top-[70px] left-0 right-0 bg-white border border-border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                  {unattachedContacts
                    .filter((contact) => {
                      const searchLower = searchContactQuery.toLowerCase();
                      return (
                        contact.firstName.toLowerCase().includes(searchLower) ||
                        contact.lastName.toLowerCase().includes(searchLower) ||
                        contact.position.toLowerCase().includes(searchLower)
                      );
                    })
                    .length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      No matching contacts found
                    </div>
                  ) : (
                    unattachedContacts
                      .filter((contact) => {
                        const searchLower = searchContactQuery.toLowerCase();
                        return (
                          contact.firstName.toLowerCase().includes(searchLower) ||
                          contact.lastName.toLowerCase().includes(searchLower) ||
                          contact.position.toLowerCase().includes(searchLower)
                        );
                      })
                      .map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b border-border last:border-b-0"
                          onClick={() => {
                            setSelectedContactId(contact.id);
                            setSearchContactQuery(`${contact.firstName} ${contact.lastName}`);
                          }}
                        >
                          <div className="font-medium text-sm">{contact.firstName} {contact.lastName}</div>
                          <div className="text-xs text-muted-foreground">{contact.position}</div>
                        </button>
                      ))
                  )}
                </div>
              )}

              {selectedContactId && !searchContactQuery && (
                <p className="text-xs text-green-600">Contact selected</p>
              )}
            </div>
          )}

          {/* Form Fields (only in 'new' mode) */}
          {mode === 'new' && (
            <>
          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-medium">
              First Name *
            </Label>
            <Input
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="Robert"
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
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Williams"
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
              value={formData.position}
              onChange={handleInputChange}
              placeholder="Service Manager"
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

          {/* Business Assignment */}
          {businesses.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="business" className="text-sm font-medium">
                Business
              </Label>
              <Select value={formData.businessId} onValueChange={handleBusinessSelect}>
                <SelectTrigger disabled={loading}>
                  <SelectValue placeholder="Select a business..." />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="robert.williams@kone.com"
              className={errors.email ? 'border-red-500' : ''}
              disabled={loading}
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
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="(555) 567-8901"
              disabled={loading}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Category *
            </Label>
            <Select value={formData.category} onValueChange={handleSelectChange}>
              <SelectTrigger
                disabled={loading}
                className={errors.category ? 'border-red-500' : ''}
              >
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 ? (
                  <SelectItem value="" disabled>
                    No categories available
                  </SelectItem>
                ) : (
                  categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.category}
              </p>
            )}
          </div>
            </>
          )}

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
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading
              ? isEditing
                ? 'Updating...'
                : mode === 'assign'
                ? 'Assigning...'
                : 'Adding...'
              : isEditing
              ? 'Update Contact'
              : mode === 'assign'
              ? 'Assign Contact'
              : 'Add Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
