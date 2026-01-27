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
import { useNotifications } from '@/hooks/useNotifications';
import { UserPortalProfileCard } from '@/components/userportal/UserPortalProfileCard';
import { AssignedWorkTable } from '@/components/userportal/AssignedWorkTable';
import { AssignedWorkMap } from '@/components/userportal/AssignedWorkMap';
import { UserPortalNotifications } from '@/components/userportal/UserPortalNotifications';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';

const UserPortal = () => {
  const { user } = useAuth();
  const { profile: userProfile, loading: profileLoading, fetchMyProfile, updateProfile } = useProfile();
  const { assignedStages, totalAssigned, loading: portalLoading } = useUserPortal();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(user?.email);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Fetch user profile on mount
  useEffect(() => {
    fetchMyProfile();
  }, [fetchMyProfile]);

  const handleSaveProfile = async (updates: any) => {
    await updateProfile(updates);
    setEditProfileOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="flex flex-col h-screen">
        {/* Page Header */}
        <div className="py-6 px-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-8 w-8" />
            My Work Portal
          </h1>
          <p className="text-muted-foreground mt-1">
            View your profile and all work assigned to you
          </p>
        </div>

        {/* Three Column Layout: Profile, Work (Map + Table), and Notifications */}
        <div className="flex gap-6 px-4 pb-4 flex-1 min-h-0">
          {/* Left Column: Profile Card */}
          <div className="w-[420px] flex-shrink-0 flex flex-col">
            <UserPortalProfileCard
              profile={userProfile}
              email={user?.email || ''}
              totalAssigned={totalAssigned}
              onEditProfile={() => setEditProfileOpen(true)}
            />
          </div>

          {/* Middle Column: Assigned Work with Map and Table */}
          <div className="flex-1 min-w-0 flex flex-col">
            <Card className="flex-1 min-h-0 flex flex-col">
              <CardHeader>
                <CardTitle>Assigned Work</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 flex gap-4 p-4">
                {/* Map View - Narrower */}
                <div className="w-1/4 min-w-[280px]">
                  <AssignedWorkMap rows={assignedStages} />
                </div>

                {/* Table View */}
                <div className="flex-1 min-w-0">
                  <AssignedWorkTable rows={assignedStages} loading={portalLoading || profileLoading} compact />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Notifications - Wider */}
          <div className="w-[480px] flex-shrink-0 flex flex-col">
            <UserPortalNotifications
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onDelete={deleteNotification}
            />
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {userProfile && (
        <EditProfileModal
          profile={userProfile}
          isOpen={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          onSave={handleSaveProfile}
          loading={profileLoading}
        />
      )}
    </div>
  );
};

export default UserPortal;
