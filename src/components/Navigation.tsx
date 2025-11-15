import { Link, useLocation } from "react-router-dom";
import { memo } from "react";
import { cn } from "@/lib/utils";

interface NavigationProps {
  className?: string;
}

const navItems = [
  { label: "Projects", path: "/sites" },
  { label: "Contacts", path: "/contact" },
];

const NavigationComponent = ({ className }: NavigationProps) => {
  const location = useLocation();

  // Simplified navigation - all users have same permissions
  const allNavItems = navItems;

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

// Memoize Navigation component to prevent re-renders when parent updates
// Only re-render if className prop changes (which rarely happens)
export const Navigation = memo(NavigationComponent, (prevProps, nextProps) => {
  return prevProps.className === nextProps.className;
});