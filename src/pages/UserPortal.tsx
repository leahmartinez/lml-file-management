/**
 * User Portal Page
 * Shows current user's profile and assigned work
 */

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUserPortal } from '@/hooks/useUserPortal';
import { UserPortalProfileCard } from '@/components/userportal/UserPortalProfileCard';
import { AssignedWorkTable } from '@/components/userportal/AssignedWorkTable';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';

const UserPortal = () => {
  const { user } = useAuth();
  const { profile: userProfile, loading: profileLoading, fetchMyProfile } = useProfile();
  const { assignedStages, totalAssigned, loading: portalLoading } = useUserPortal();
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Fetch user profile on mount
  useEffect(() => {
    fetchMyProfile();
  }, [fetchMyProfile]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="flex flex-col">
        {/* Page Header */}
        <div className="py-6 px-4">
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Briefcase className="h-8 w-8" />
                  My Work Portal
                </h1>
                <p className="text-muted-foreground mt-1">
                  View your profile and all work assigned to you
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 space-y-6 flex-1">
          {/* Profile Card */}
          <UserPortalProfileCard
            profile={userProfile}
            email={user?.email || ''}
            totalAssigned={totalAssigned}
            onEditProfile={() => setEditProfileOpen(true)}
          />

          {/* Assigned Work Section */}
          <Card>
            <CardHeader>
              <CardTitle>Assigned Work</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignedWorkTable rows={assignedStages} loading={portalLoading || profileLoading} />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
      />
    </div>
  );
};

export default UserPortal;
