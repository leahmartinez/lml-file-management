/**
 * Contact Card Component
 * Displays a single contact in card format with basic information
 * Used in contact directory listings
 */

import React from 'react';
import { DirectoryContact, Business } from '@/types/data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, Building, ExternalLink, Loader2 } from 'lucide-react';

interface ContactCardProps {
  contact: DirectoryContact;
  onViewDetails?: (contact: DirectoryContact) => void;
  onDelete?: (contact: DirectoryContact) => void;
  canDelete?: boolean;
  compact?: boolean;
  isLoading?: boolean;
  businesses?: Business[];
  onViewBusiness?: (business: Business) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onViewDetails,
  onDelete,
  canDelete = false,
  compact = false,
  isLoading = false,
  businesses = [],
  onViewBusiness,
}) => {
  const fullName = `${contact.firstName} ${contact.lastName}`;

  // Generate initials for fallback avatar
  const initials = `${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}`.toUpperCase();

  // Only show delete button for external contacts when user has permission
  const showDeleteButton = canDelete && contact.type === 'external' && onDelete;

  // Get the business this contact is affiliated with
  const affiliatedBusiness = (contact as any).businessId && businesses.length > 0
    ? businesses.find(b => b.id === (contact as any).businessId)
    : null;

  if (compact) {
    // Compact card for list view
    return (
      <Card
        className={`hover:shadow-md transition-shadow cursor-pointer h-full relative group ${isLoading ? 'opacity-60' : ''}`}
        onClick={() => onViewDetails?.(contact)}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/50">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header with avatar and basic info */}
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {contact.photo ? (
                  <img
                    src={contact.photo}
                    alt={fullName}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {initials}
                    </span>
                  </div>
                )}
              </div>

              {/* Name and position */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{fullName}</h3>
                <p className="text-xs text-primary truncate">{contact.position}</p>
                {contact.site && (
                  <p className="text-xs text-muted-foreground truncate">{contact.site}</p>
                )}
                {affiliatedBusiness && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewBusiness?.(affiliatedBusiness);
                    }}
                    className="text-xs text-blue-600 hover:underline truncate block"
                  >
                    {affiliatedBusiness.name}
                  </button>
                )}
              </div>

              {/* Category badge */}
              {contact.category && (
                <Badge
                  variant={
                    contact.category === 'LML Lift Consultants'
                      ? 'default'
                      : contact.category === 'Client'
                        ? 'secondary'
                        : 'outline'
                  }
                  className="text-xs flex-shrink-0"
                >
                  {contact.category}
                </Badge>
              )}
            </div>

            {/* Contact info summary */}
            <div className="space-y-1 text-xs">
              {contact.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <a
                    href={`mailto:${contact.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="truncate text-blue-600 hover:underline"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  <a
                    href={`tel:${contact.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 hover:underline"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full card for detail view
  return (
    <Card className={`hover:shadow-lg transition-shadow relative ${isLoading ? 'opacity-60' : ''}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {contact.photo ? (
                <img
                  src={contact.photo}
                  alt={fullName}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-lg font-semibold text-muted-foreground">
                    {initials}
                  </span>
                </div>
              )}
            </div>

            {/* Name and title */}
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{fullName}</h2>
              <p className="text-sm font-medium text-primary">{contact.position}</p>
              {contact.department && (
                <p className="text-sm text-muted-foreground">{contact.department}</p>
              )}
              {contact.site && (
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{contact.site}</span>
                </div>
              )}
              {affiliatedBusiness && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewBusiness?.(affiliatedBusiness);
                  }}
                  className="text-sm text-blue-600 hover:underline mt-1 flex items-center gap-2"
                >
                  <Building className="h-4 w-4" />
                  {affiliatedBusiness.name}
                </button>
              )}
            </div>
          </div>

          {/* Category badge */}
          {contact.category && (
            <Badge
              variant={
                contact.category === 'LML Lift Consultants'
                  ? 'default'
                  : contact.category === 'Client'
                    ? 'secondary'
                    : 'outline'
              }
            >
              {contact.category}
            </Badge>
          )}
        </div>

        {/* Contact Information */}
        <div className="space-y-3 border-t pt-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Contact Information</h3>
            <div className="space-y-2">
              {/* Email */}
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-sm text-blue-600 hover:underline truncate"
                  >
                    {contact.email}
                  </a>
                </div>
              )}

              {/* Phone */}
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contact.phone}`} className="text-sm text-blue-600 hover:underline">
                    {contact.phone}
                  </a>
                </div>
              )}

              {/* Office Phone */}
              {contact.officePhone && (
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contact.officePhone}`} className="text-sm text-blue-600 hover:underline">
                    {contact.officePhone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          {contact.bio && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-2">About</h3>
              <p className="text-sm text-muted-foreground">{contact.bio}</p>
            </div>
          )}
        </div>

        {/* Action button */}
        {onViewDetails && (
          <Button
            onClick={() => onViewDetails(contact)}
            variant="outline"
            size="sm"
            className="w-full mt-4 gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Full Profile
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
