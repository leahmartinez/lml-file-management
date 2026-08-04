import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { UserRole } from "../../shared/constants/roles";

interface NavigationProps {
  className?: string;
}

const navItems = [
  { label: "My Work", path: "/my-work" },
  { label: "Projects", path: "/sites" },
  { label: "Overview", path: "/dashboard" },
  { label: "Proposals", path: "/proposals" },
  { label: "Contacts", path: "/contact" },
  { label: "Admin", path: "/admin", adminOnly: true },
];

const NavigationComponent = ({ className }: NavigationProps) => {
  const location = useLocation();
  const { role } = usePermissions();

  // Filter navigation items based on user role
  // Uses usePermissions' normalized role so legacy role strings (e.g. lowercase
  // "admin" seeded in local dev data) are still recognized, not just the current
  // UserRole enum values.
  const allNavItems = navItems.filter(item => {
    if (item.adminOnly) {
      return role === UserRole.Admin || role === UserRole.AdminStaff;
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