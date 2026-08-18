import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.tsx";
import { useUnreadAlertCount } from "@/hooks/useAlerts";
import { NotificationBell } from "@/components/NotificationBell";
import LMLIcon from "@/assets/LML-Icon.svg";

export const Header = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Fetch unread count using new alerts API
  const { data: unreadCount = 0 } = useUnreadAlertCount();

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
            <NotificationBell unreadCount={unreadCount} />
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
