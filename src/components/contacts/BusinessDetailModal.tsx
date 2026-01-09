/**
 * Business Detail Modal Component
 * Shows business information and affiliated contacts in a modal/sidebar
 */

import React from 'react';
import { Business, ExternalContact } from '@/types/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Edit2, Trash2, Plus, MapPin, Phone, Mail, Users, ArrowLeft } from 'lucide-react';

interface BusinessDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
  affiliatedContacts: ExternalContact[];
  onEdit?: (business: Business) => void;
  onDelete?: (businessId: string) => void;
  onEditContact?: (contact: ExternalContact) => void;
  onDeleteContact?: (contactId: string) => void;
  onAddContact?: (businessId: string) => void;
  onViewContact?: (contact: ExternalContact) => void;
  onBack?: () => void;
}

export const BusinessDetailModal: React.FC<BusinessDetailModalProps> = ({
  isOpen,
  onClose,
  business,
  affiliatedContacts,
  onEdit,
  onDelete,
  onEditContact,
  onDeleteContact,
  onAddContact,
  onViewContact,
  onBack,
}) => {
  if (!business) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <DialogTitle>{business.name}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Business Information Card */}
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <h3 className="font-semibold mb-4">Business Information</h3>

            <div className="space-y-3">
              {business.description && (
                <div>
                  <p className="text-sm text-muted-foreground">{business.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {business.category && (
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">Category</span>
                    <p className="text-sm text-foreground">{business.category}</p>
                  </div>
                )}
                {business.city && (
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">Location</span>
                    <p className="text-sm text-foreground">
                      {business.city}
                      {business.state && `, ${business.state}`}
                    </p>
                  </div>
                )}
              </div>

              {business.address && (
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Address</span>
                  <p className="text-sm text-foreground">{business.address}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2">
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="text-xs text-primary hover:underline flex items-center gap-2"
                  >
                    <Phone className="h-3 w-3" />
                    {business.phone}
                  </a>
                )}
                {business.email && (
                  <a
                    href={`mailto:${business.email}`}
                    className="text-xs text-primary hover:underline flex items-center gap-2"
                  >
                    <Mail className="h-3 w-3" />
                    {business.email}
                  </a>
                )}
              </div>

              {business.website && (
                <div className="pt-2">
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    {business.website}
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Affiliated Contacts Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Affiliated Contacts ({affiliatedContacts.length})
              </h3>
              <Button
                size="sm"
                onClick={() => {
                  onAddContact?.(business.id);
                  onClose();
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Contact
              </Button>
            </div>

            {affiliatedContacts.length === 0 ? (
              <Card className="p-6 text-center border-dashed">
                <p className="text-sm text-muted-foreground">
                  No contacts affiliated with this business yet
                </p>
              </Card>
            ) : (
              <div className="space-y-1">
                {affiliatedContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => onViewContact?.(contact)}
                    className="w-full text-left px-2 py-2 hover:bg-muted rounded transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-blue-600 hover:underline truncate">
                        {contact.firstName} {contact.lastName}
                      </span>
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-muted-foreground hover:text-primary hover:underline truncate"
                          title={contact.email}
                        >
                          {contact.email}
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{contact.position}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onEdit?.(business);
              onClose();
            }}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Business
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onDelete?.(business.id);
              onClose();
            }}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
