/**
 * User Portal - Profile Card
 * Displays current user's profile information
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/types/data';
import { Edit } from 'lucide-react';

interface UserPortalProfileCardProps {
  profile: UserProfile | null;
  email: string;
  totalAssigned: number;
  onEditProfile: () => void;
}

export const UserPortalProfileCard: React.FC<UserPortalProfileCardProps> = ({
  profile,
  email,
  totalAssigned,
  onEditProfile,
}) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>My Profile</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEditProfile}
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit Profile
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {/* Profile Photo - Centered at top */}
        <div className="flex flex-col items-center mb-6">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-3">
            {profile?.photo ? (
              <img
                src={profile.photo}
                alt={profile?.firstName}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="text-3xl font-bold text-muted-foreground">
                {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold">
            {profile?.firstName} {profile?.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">{profile?.position || 'Not specified'}</p>
        </div>

        {/* Profile Information - Streamlined single column */}
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm font-medium text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{email}</span>
          </div>

          {profile?.phone && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">Phone</span>
              <span className="text-sm font-medium">{profile.phone}</span>
            </div>
          )}

          {profile?.officePhone && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">Office Phone</span>
              <span className="text-sm font-medium">{profile.officePhone}</span>
            </div>
          )}

          {profile?.department && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">Department</span>
              <span className="text-sm font-medium">{profile.department}</span>
            </div>
          )}

          {profile?.category && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">Category</span>
              <span className="text-sm font-medium">{profile.category}</span>
            </div>
          )}
        </div>

        {/* Bio section if exists */}
        {profile?.bio && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-2">About</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Work Assigned - Highlighted box */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Work Assigned</p>
            <p className="text-3xl font-bold">{totalAssigned}</p>
            <p className="text-xs text-muted-foreground">stages assigned to you</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

UserPortalProfileCard.displayName = 'UserPortalProfileCard';
