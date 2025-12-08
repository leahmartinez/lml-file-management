import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DirectoryContact } from "@/types/data";
import { X, Mail, Phone, Briefcase, MapPin } from "lucide-react";

interface ContactDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: DirectoryContact | null;
}

export const ContactDetailModal = ({
  isOpen,
  onClose,
  contact,
}: ContactDetailModalProps) => {
  if (!contact) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <h3 className="text-lg font-semibold">
              {contact.firstName} {contact.lastName}
            </h3>
          </div>

          {/* Email */}
          {contact.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <a
                  href={`mailto:${contact.email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {contact.email}
                </a>
              </div>
            </div>
          )}

          {/* Phone */}
          {contact.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <a
                  href={`tel:${contact.phone}`}
                  className="text-sm text-primary hover:underline"
                >
                  {contact.phone}
                </a>
              </div>
            </div>
          )}

          {/* Office Phone */}
          {contact.officePhone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Office Phone</p>
                <a
                  href={`tel:${contact.officePhone}`}
                  className="text-sm text-primary hover:underline"
                >
                  {contact.officePhone}
                </a>
              </div>
            </div>
          )}

          {/* Position */}
          {contact.position && (
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Position</p>
                <p className="text-sm">{contact.position}</p>
              </div>
            </div>
          )}

          {/* Department */}
          {contact.department && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm">{contact.department}</p>
              </div>
            </div>
          )}

          {/* Category */}
          {contact.category && (
            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="text-sm font-medium">{contact.category}</p>
            </div>
          )}

          {/* Bio */}
          {contact.bio && (
            <div>
              <p className="text-xs text-muted-foreground">Bio</p>
              <p className="text-sm text-muted-foreground">{contact.bio}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
