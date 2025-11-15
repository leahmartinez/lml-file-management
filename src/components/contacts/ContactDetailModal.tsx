/**
 * Contact Detail Modal Component
 * Displays full contact information in a modal
 * Used for viewing detailed contact profiles
 */

import React from 'react';
import { DirectoryContact } from '@/types/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Building, MapPin, ExternalLink } from 'lucide-react';

interface ContactDetailModalProps {
  contact: DirectoryContact | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (contact: DirectoryContact) => void;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  contact,
  isOpen,
  onClose,
  onEdit,
}) => {
  if (!contact) {
    return null;
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;
  const initials = `${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}`.toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contact Details</DialogTitle>
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

          {/* Edit button for external contacts (admin only) */}
          {contact.type === 'external' && onEdit && (
            <div className="border-t pt-4">
              <Button
                onClick={() => onEdit(contact)}
                className="w-full gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Edit Contact
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
