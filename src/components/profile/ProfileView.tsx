/**
 * Profile View Component
 * Displays user profile information in a read-only format
 * Can be used to view own profile or another user's profile
 */

import React from 'react';
import { UserProfile } from '@/types/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, Building, Briefcase, Edit } from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile;
  isCurrentUser?: boolean;
  onEdit?: () => void;
  loading?: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  isCurrentUser = false,
  onEdit,
  loading = false,
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Loading profile...</div>
        </CardContent>
      </Card>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Profile Photo */}
          <div className="flex-shrink-0">
            {profile.photo ? (
              <img
                src={profile.photo}
                alt={fullName}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <span className="text-xl font-semibold text-muted-foreground">
                  {profile.firstName.charAt(0)}
                  {profile.lastName.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Name and Title */}
          <div>
            <CardTitle className="text-2xl">{fullName}</CardTitle>
            <p className="text-sm font-semibold text-primary">{profile.position}</p>
            {profile.department && (
              <p className="text-sm text-muted-foreground">{profile.department}</p>
            )}
          </div>
        </div>

        {/* Edit Button */}
        {isCurrentUser && onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Contact Information */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
          <div className="space-y-2">
            {/* Email */}
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${profile.email}`} className="text-sm text-blue-600 hover:underline">
                {profile.email}
              </a>
            </div>

            {/* Phone */}
            {profile.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${profile.phone}`} className="text-sm hover:underline">
                  {profile.phone}
                </a>
              </div>
            )}

            {/* Office Phone */}
            {profile.officePhone && (
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${profile.officePhone}`} className="text-sm hover:underline">
                  {profile.officePhone}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Sites */}
        {profile.sites && profile.sites.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Assigned Sites
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.sites.map((site) => (
                <Badge key={site} variant="outline">
                  {site}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
          {profile.createdAt && (
            <p>Profile created: {new Date(profile.createdAt).toLocaleDateString()}</p>
          )}
          {profile.updatedAt && (
            <p>Last updated: {new Date(profile.updatedAt).toLocaleDateString()}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
