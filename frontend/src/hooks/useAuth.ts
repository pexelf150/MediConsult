import { useEffect, useState } from "react";

export type AppRole = "patient" | "doctor" | "admin";

export interface User {
  id?: string;
  _id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role: AppRole;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage
    const userStr = localStorage.getItem('user');
    const userRole = localStorage.getItem('userRole') as AppRole | null;

    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setRole(userRole);
      } catch (e) {
        console.error('Failed to parse user data from localStorage', e);
      }
    }

    setLoading(false);
  }, []);

  return { user, role, loading };
}
