import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { LogOut, Bell, Home, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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
    const fetchUserData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        
        // Fetch notification count
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: 'exact', head: true });
        setNotificationCount(count || 0);
      }
    };
    
    fetchUserData();
  }, []);

  // Get user initials from email or name
  const getUserInitials = () => {
    if (!user) return 'U';
    const email = user.email;
    if (email) {
      const parts = email.split('@')[0].split('.');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Get display name from user metadata or email
  const getDisplayName = () => {
    if (!user) return 'User';
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user.user_metadata?.name) {
      return user.user_metadata.name;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
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
            <img src={logo} alt="MediConsult Logo" className="h-9 w-9 rounded-lg object-cover" />
            <div>
              <div className="text-xl font-bold text-slate-800 tracking-tight">MediConsult</div>
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
            <Link to="/" className="flex items-center p-3.5 text-slate-300 hover:text-white transition-colors">
              <Home className="h-4 w-4" />
            </Link>
            {nav}
          </div>
          <div className="flex items-center p-3.5 text-slate-300 hover:text-white cursor-pointer transition-colors">
            <Search className="h-4 w-4" />
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
