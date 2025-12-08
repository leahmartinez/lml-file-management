import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.tsx";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationBell } from "@/components/NotificationBell";
import LMLIcon from "@/assets/LML-Icon.svg";

export const Header = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(user?.email);

  const handleLogout = () => {
    logout();
    navigate("/login");
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
            <NotificationBell
              unreadCount={unreadCount}
              notifications={notifications}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
              onMarkAllAsRead={markAllAsRead}
            />
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
    </>
  );
};