import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { LogOut, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import logo from "@/assets/logo.jpeg";

function AnimatedContent({ children, pathname }: { children: ReactNode; pathname: string }) {
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

export function AppShell({
  children,
  nav,
  title,
}: {
  children: ReactNode;
  nav?: ReactNode;
  title?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    // Load user from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (e) {
        console.error('Failed to parse user data from localStorage', e);
      }
    }
  }, []);

  // Get user initials from email or name
  const getUserInitials = () => {
    if (!user) return 'U';
    if (user.fullName) {
      const parts = user.fullName.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.fullName.substring(0, 2).toUpperCase();
    }
    if (user.email) {
      const parts = user.email.split('@')[0].split('.');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Get display name from user metadata or email
  const getDisplayName = () => {
    if (!user) return 'User';
    if (user.fullName) {
      return user.fullName;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-foreground relative isolate overflow-hidden">
      {/* Top gold bar */}
      <div className="h-1.5 bg-amber-400" />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-2.5">
          {/* Brand section */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Premedi Lanka Logo" className="h-10 w-[60px] rounded-lg object-cover" />
            <div>
              <div className="text-xl font-bold text-slate-800 tracking-tight">Premedi Lanka</div>
              <div className="text-[10px] font-semibold text-slate-600 tracking-widest uppercase">Healthcare Platform</div>
            </div>
          </Link>

          {/* Right section */}
          <div className="flex items-center gap-4">
            {/* Bell with badge */}
            <div className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-slate-600 text-white">
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white border-2 border-white">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </div>

            {/* User info */}
            <div className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm font-semibold text-slate-700">{getDisplayName()}</span>
              <ChevronDown className="h-3 w-3 text-slate-500" />
            </div>

            {/* Avatar */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600">
              {getUserInitials()}
            </div>

            {/* Sign out */}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation bar */}
      <nav className="sticky top-[73px] z-10 bg-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center">
            {nav}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-1 py-8 relative z-10">
        <AnimatedContent pathname={location.pathname}>
          {children}
        </AnimatedContent>
      </main>
    </div>
  );
}
