import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // The backend should have set a cookie with the token
        // We'll check if we're authenticated by trying to get the user
        console.log('Fetching user from /api/auth/me');
        const response = await fetch('/api/auth/me', {
          credentials: "include",
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
          if (data.data?.user) {
            // Persist user in localStorage for frontend auth
            const user = data.data.user;
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('userId', user._id || user.id);
            localStorage.setItem('userRole', user.role);
            
            console.log('User data stored in localStorage:', {
              user: user.email,
              role: user.role,
              _id: user._id
            });
            
            // User is authenticated, redirect to appropriate dashboard based on role
            const userRole = user.role;
            console.log('Redirecting to dashboard with role:', userRole);
            
            // Small delay to ensure localStorage is set before redirect
            setTimeout(() => {
              if (userRole === 'doctor') {
                console.log('Redirecting to /doctor');
                window.location.href = '/doctor';
              } else {
                console.log('Redirecting to /patient');
                window.location.href = '/patient';
              }
            }, 100);
          } else {
            console.error('No user data in response');
            setError("Authentication failed - no user data");
          }
        } else {
          console.error('Response not OK:', response.status, data);
          setError(`Authentication failed: ${data.message || response.statusText}`);
        }
      } catch (err) {
        console.error('Error during authentication:', err);
        setError("An error occurred during authentication");
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-50">
        <div className="rounded-2xl border bg-white p-8 shadow-soft">
          <h1 className="text-2xl font-semibold text-red-600">Authentication Error</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-4 rounded-full bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-emerald-50">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
        <p className="mt-4 text-sm text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}
