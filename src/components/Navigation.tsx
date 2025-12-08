import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface NavigationProps {
  className?: string;
}

const navItems = [
  { label: "Projects", path: "/sites" },
  { label: "Dashboard", path: "/dashboard" },
  { label: "Proposals", path: "/proposals" },
  { label: "Contacts", path: "/contact" },
  { label: "Admin", path: "/admin", adminOnly: true },
];

const NavigationComponent = ({ className }: NavigationProps) => {
  const location = useLocation();
  const { user } = useAuth();

  // Filter navigation items based on user role
  const allNavItems = navItems.filter(item => {
    if (item.adminOnly) {
      return user?.role === 'admin';
    }
    return true;
  });

  return (
    <nav className={cn("border-b border-border bg-card", className)}>
      <div className="px-6">
        <div className="flex space-x-8">
          {allNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative py-4 text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
              {location.pathname === item.path && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

// Export Navigation component (no memoization to ensure proper re-renders when user role changes)
export const Navigation = NavigationComponent;