/**
 * Business Card Component
 * Displays business information in a card format for the contacts grid
 * Click to open modal showing affiliated contacts
 */

import React from 'react';
import { Business } from '@/types/data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, ChevronRight, MapPin, Phone, Mail, Users } from 'lucide-react';

interface BusinessCardProps {
  business: Business;
  contactCount?: number;
  onViewContacts?: (business: Business) => void;
  onEdit?: (business: Business) => void;
  onDelete?: (businessId: string) => void;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({
  business,
  contactCount = 0,
  onViewContacts,
  onEdit,
  onDelete,
}) => {
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => onViewContacts?.(business)}
    >
      <CardContent className="p-4 h-full flex flex-col">
        {/* Header with Business Name */}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {business.name}
              </h3>
              {business.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {business.description}
                </p>
              )}
            </div>
            <div className="flex-shrink-0">
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>

          {/* Location & Category */}
          <div className="space-y-1 mb-3 text-muted-foreground">
            {business.city && (
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="h-3 w-3" />
                <span>
                  {business.city}
                  {business.state && `, ${business.state}`}
                </span>
              </div>
            )}
            {business.category && (
              <div className="inline-block text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                {business.category}
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-1">
            {business.phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <a
                  href={`tel:${business.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary hover:underline truncate"
                >
                  {business.phone}
                </a>
              </div>
            )}
            {business.email && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <a
                  href={`mailto:${business.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary hover:underline truncate"
                >
                  {business.email}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Contact Count Badge */}
        <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-border/40">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            {contactCount} contact{contactCount !== 1 ? 's' : ''}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit?.(business)}
              title="Edit business"
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete?.(business.id)}
              title="Delete business"
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
