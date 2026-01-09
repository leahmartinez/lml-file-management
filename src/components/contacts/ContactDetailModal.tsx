/**
 * Contact Detail Modal Component
 * Displays full contact information in a modal
 * Used for viewing detailed contact profiles
 */

import React, { useState, useEffect } from 'react';
import { DirectoryContact, Business } from '@/types/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Phone, Building, MapPin, Edit2, Trash2, Search, ArrowLeft } from 'lucide-react';

interface ContactDetailModalProps {
  contact: DirectoryContact | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (contact: DirectoryContact) => void;
  onDelete?: (contact: DirectoryContact) => void;
  canDelete?: boolean;
  businesses?: Business[];
  onUpdateBusiness?: (contactId: string, businessId: string | undefined) => Promise<void>;
  onViewBusiness?: (business: Business) => void;
  onBack?: () => void;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  contact,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  canDelete = false,
  businesses = [],
  onUpdateBusiness,
  onViewBusiness,
  onBack,
}) => {
  const [businessSearch, setBusinessSearch] = useState('');
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [updatingBusiness, setUpdatingBusiness] = useState(false);
  const [pendingBusinessId, setPendingBusinessId] = useState<string | null>(null);

  // Clear pendingBusinessId when contact's businessId has been updated by parent
  useEffect(() => {
    if (contact && pendingBusinessId && (contact as any).businessId === pendingBusinessId) {
      setPendingBusinessId(null);
    }
  }, [contact, pendingBusinessId]);

  if (!contact) {
    return null;
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;
  const initials = `${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}`.toUpperCase();

  // Use pendingBusinessId if set (optimistic UI), otherwise use actual contact businessId
  const displayedBusinessId = pendingBusinessId || (contact as any).businessId;
  const displayedBusiness = displayedBusinessId && businesses.length > 0
    ? businesses.find(b => b.id === displayedBusinessId)
    : null;
  const affiliatedBusiness = (contact as any).businessId && businesses.length > 0
    ? businesses.find(b => b.id === (contact as any).businessId)
    : null;

  const filteredBusinesses = businessSearch.trim()
    ? businesses.filter(b =>
        b.name.toLowerCase().includes(businessSearch.toLowerCase())
      )
    : businesses;

  const handleSelectBusiness = async (businessId: string) => {
    if (!onUpdateBusiness) return;
    setPendingBusinessId(businessId); // Optimistic UI - show change immediately
    setUpdatingBusiness(true);
    try {
      await onUpdateBusiness(contact.id, businessId);
      setBusinessSearch('');
      setShowBusinessDropdown(false);
    } catch (error) {
      console.error('Error updating business:', error);
      setPendingBusinessId(null); // Revert on error
    } finally {
      setUpdatingBusiness(false);
    }
  };

  const handleRemoveBusiness = async () => {
    if (!onUpdateBusiness) return;
    setPendingBusinessId(null); // Optimistic UI - show removal immediately
    setUpdatingBusiness(true);
    try {
      await onUpdateBusiness(contact.id, undefined);
      setBusinessSearch('');
    } catch (error) {
      console.error('Error removing business:', error);
      // On error, restore the previous business if we had one
      setPendingBusinessId((contact as any).businessId || null);
    } finally {
      setUpdatingBusiness(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setBusinessSearch('');
        setShowBusinessDropdown(false);
        setPendingBusinessId(null);
      }
      onClose();
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="h-8 w-8 p-0"
                title="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>Contact Details</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
          {/* Header with photo */}
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {contact.photo ? (
                <img
                  src={contact.photo}
                  alt={fullName}
                  className="h-24 w-24 rounded-full object-cover border-2 border-muted"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-2 border-muted-foreground/25">
                  <span className="text-2xl font-semibold text-muted-foreground">
                    {initials}
                  </span>
                </div>
              )}
            </div>

            {/* Name and type info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h2 className="text-2xl font-semibold">{fullName}</h2>
                  <p className="text-sm font-medium text-primary mt-1">{contact.position}</p>
                </div>
                <Badge variant={contact.type === 'user' ? 'default' : 'outline'}>
                  {contact.type === 'user' ? 'User' : 'External'}
                </Badge>
              </div>

              {/* Additional info */}
              {contact.department && (
                <p className="text-sm text-muted-foreground mb-2">{contact.department}</p>
              )}
              {contact.site && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {contact.site}
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          {(contact.email || contact.phone || contact.officePhone) && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
              <div className="space-y-3">
                {/* Email */}
                {contact.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {contact.email}
                      </a>
                    </div>
                  </div>
                )}

                {/* Phone */}
                {contact.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Phone</p>
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                )}

                {/* Office Phone */}
                {contact.officePhone && (
                  <div className="flex items-start gap-3">
                    <Building className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Office Phone</p>
                      <a
                        href={`tel:${contact.officePhone}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {contact.officePhone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bio */}
          {contact.bio && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-2">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{contact.bio}</p>
            </div>
          )}

          {/* Business for external contacts */}
          {contact.type === 'external' && businesses.length > 0 && onUpdateBusiness && (
            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Business</Label>
                  {displayedBusiness && (
                    <button
                      onClick={handleRemoveBusiness}
                      disabled={updatingBusiness}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {displayedBusiness ? (
                  <button
                    onClick={() => onViewBusiness?.(displayedBusiness)}
                    className="w-full text-left p-3 bg-blue-50 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <p className="text-sm font-medium text-blue-600 hover:underline">{displayedBusiness.name}</p>
                    {displayedBusiness.city && (
                      <p className="text-xs text-muted-foreground">{displayedBusiness.city}</p>
                    )}
                  </button>
                ) : (
                  <p className="text-sm text-muted-foreground">Not affiliated with any business</p>
                )}

                <div className="relative">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Search businesses..."
                        value={businessSearch}
                        onChange={(e) => {
                          setBusinessSearch(e.target.value);
                          setShowBusinessDropdown(true);
                        }}
                        onFocus={() => setShowBusinessDropdown(true)}
                        onBlur={() => setTimeout(() => setShowBusinessDropdown(false), 200)}
                        disabled={updatingBusiness}
                        className="text-sm"
                      />
                      {businessSearch && showBusinessDropdown && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-border rounded-md shadow-lg z-50 mt-1 max-h-96 overflow-y-auto">
                          {filteredBusinesses.length === 0 ? (
                            <div className="p-3 text-sm text-muted-foreground">
                              No businesses found
                            </div>
                          ) : (
                            filteredBusinesses.map((business) => (
                              <button
                                key={business.id}
                                type="button"
                                onClick={() => handleSelectBusiness(business.id)}
                                disabled={updatingBusiness}
                                className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b border-border last:border-b-0 disabled:opacity-50"
                              >
                                <div className="font-medium text-sm">{business.name}</div>
                                {business.city && (
                                  <div className="text-xs text-muted-foreground">{business.city}</div>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons for external contacts (admin only) */}
          {contact.type === 'external' && (onEdit || (canDelete && onDelete)) && (
            <div className="border-t pt-4 flex gap-2">
              {onEdit && (
                <Button
                  onClick={() => onEdit(contact)}
                  className="flex-1 gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Contact
                </Button>
              )}
              {canDelete && onDelete && (
                <Button
                  onClick={() => onDelete(contact)}
                  variant="destructive"
                  className="flex-1 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
