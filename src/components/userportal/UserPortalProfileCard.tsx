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
    <Card>
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
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Photo */}
          <div className="flex flex-col items-center justify-center">
            <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center mb-4">
              {profile?.photo ? (
                <img
                  src={profile.photo}
                  alt={profile?.firstName}
                  className="h-32 w-32 rounded-full object-cover"
                />
              ) : (
                <div className="text-4xl font-bold text-muted-foreground">
                  {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Profile Information */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">
                {profile?.firstName} {profile?.lastName}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm">{email}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Position</p>
              <p className="text-sm">{profile?.position || 'Not specified'}</p>
            </div>

            {profile?.phone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-sm">{profile.phone}</p>
              </div>
            )}

            {profile?.officePhone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Office Phone</p>
                <p className="text-sm">{profile.officePhone}</p>
              </div>
            )}

            {profile?.department && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Department</p>
                <p className="text-sm">{profile.department}</p>
              </div>
            )}

            {profile?.category && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-sm">{profile.category}</p>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">Work Assigned</p>
              <p className="text-2xl font-bold">{totalAssigned}</p>
              <p className="text-xs text-muted-foreground">stages assigned to you</p>
            </div>
          </div>
        </div>

        {profile?.bio && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-2">About</p>
            <p className="text-sm">{profile.bio}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

UserPortalProfileCard.displayName = 'UserPortalProfileCard';
