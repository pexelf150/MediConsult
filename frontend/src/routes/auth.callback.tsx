import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  // Use a simple script to handle the callback without React Router context
  // This avoids the "Invariant failed" error from useStore
  return (
    <div className="flex min-h-screen items-center justify-center bg-emerald-50">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
        <p className="mt-4 text-sm text-muted-foreground">Completing authentication...</p>
        <script dangerouslySetInnerHTML={{
          __html: `
            (async function() {
              try {
                console.log('Starting Google OAuth callback handling');
                
                // Check URL parameters for error
                const urlParams = new URLSearchParams(window.location.search);
                const errorParam = urlParams.get('error');
                if (errorParam) {
                  console.error('OAuth error in URL:', errorParam);
                  window.location.href = '/?error=' + encodeURIComponent(errorParam);
                  return;
                }

                // The backend should have set a cookie with the token
                // We'll check if we're authenticated by trying to get the user
                console.log('Fetching user from /api/auth/me');
                const response = await fetch('/api/auth/me', {
                  credentials: "include",
                });

                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', data);

                if (response.ok && data.data?.user) {
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
                  console.error('Authentication failed:', response.status, data);
                  window.location.href = '/?error=' + encodeURIComponent(data.message || 'Authentication failed');
                }
              } catch (err) {
                console.error('Error during authentication:', err);
                window.location.href = '/?error=' + encodeURIComponent('An error occurred during authentication');
              }
            })();
          `
        }} />
      </div>
    </div>
  );
}
