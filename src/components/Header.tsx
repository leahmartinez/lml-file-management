import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.tsx";
import { useProfile } from "@/hooks/useProfile";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import LMLIcon from "@/assets/LML-Icon.svg";

export const Header = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { profile, fetchMyProfile, updateProfile, loading: profileLoading } = useProfile();
  const [showEditModal, setShowEditModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleEditProfile = async () => {
    await fetchMyProfile();
    setShowEditModal(true);
  };

  const handleSaveProfile = async (updates: any) => {
    await updateProfile(updates);
    // Dispatch a custom event to notify other components that profile was updated
    const email = profile?.email;
    const event = new CustomEvent('profileUpdated', { detail: { email } });
    window.dispatchEvent(event);
    setShowEditModal(false);
  };

  return (
    <>
      <header className="border-b border-border bg-card shadow-sm">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Company Logo */}
          <div className="flex items-center space-x-3">
            <img
              src={LMLIcon}
              alt="LML Lift Consultants"
              className="h-10 w-10"
            />
            <div>
              <h1 className="text-lg font-semibold text-foreground">LML Lift Consultants</h1>
              <p className="text-xs text-muted-foreground">Work Management</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleEditProfile}
            >
              <User className="h-4 w-4" />
              Edit Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </Button>
          </div>
        </div>
      </header>

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          profile={profile}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveProfile}
          loading={profileLoading}
        />
      )}
    </>
  );
};