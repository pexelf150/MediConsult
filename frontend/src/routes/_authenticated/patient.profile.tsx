import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { User, Mail, Phone, Calendar, Users, Save, Loader2, Shield, Cake, CheckCircle2, Trash2, Eye, EyeOff } from "lucide-react";
import CountryCodeSelector from "@/components/country-code-selector";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patient/profile")({
  component: PatientProfile,
});

function PatientProfile() {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+94");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [age, setAge] = useState("");

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["patient-profile", user?._id || user?.id],
    enabled: !!(user?._id || user?.id),
    queryFn: async () => {
      const userId = user?._id || user?.id;
      console.log('Fetching patient profile, user ID:', userId);
      console.log('User object:', user);
      const response = await fetch(`/api/patients/profile`, {
        credentials: 'include',
      });
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);
      if (response.ok && result.data) {
        return result.data;
      }
      return null;
    },
  });

  useEffect(() => {
    console.log('useEffect triggered with profile:', profile);
    console.log('useEffect triggered with user:', user);
    if (profile) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
      console.log('Patient phone from API:', profile.phone);
      // Extract country code from phone number if it exists
      if (profile.phone && profile.phone.startsWith('+')) {
        // Handle Sri Lanka specifically: +94 followed by phone number
        if (profile.phone.startsWith('+94')) {
          setCountryCode('+94');
          setPhone(profile.phone.substring(3).replace(/\s/g, ''));
          console.log('Sri Lanka phone detected - country code: +94, phone:', profile.phone.substring(3));
        } else {
          // For other countries, use generic extraction
          const match = profile.phone.match(/^(\+[0-9]{1,3})(.*)$/);
          if (match) {
            setCountryCode(match[1]);
            setPhone(match[2].replace(/\s/g, '')); // Remove spaces from phone number
            console.log('Extracted country code:', match[1], 'phone:', match[2]);
          } else {
            setPhone(profile.phone.replace(/\s/g, '') || "");
            console.log('No match for country code, using full phone:', profile.phone);
          }
        }
      } else {
        setPhone(profile.phone?.replace(/\s/g, '') || "");
        console.log('Phone does not start with +, using:', profile.phone);
      }
      setGender(profile.gender || "");
      // Format date to yyyy-MM-dd for HTML date input
      if (profile.dateOfBirth) {
        const dob = new Date(profile.dateOfBirth);
        setDateOfBirth(dob.toISOString().split('T')[0]);
      } else {
        setDateOfBirth("");
      }
      setAge(profile.age ? String(profile.age) : "");
      console.log('Final state - countryCode:', countryCode, 'phone:', phone);
    } else if (user) {
      // Fallback to useAuth user data if profile API fails
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      console.log('User phone from useAuth:', (user as any).phone);
      // Extract country code from phone number if it exists
      const userPhone = (user as any).phone;
      if (userPhone && userPhone.startsWith('+')) {
        // Handle Sri Lanka specifically: +94 followed by phone number
        if (userPhone.startsWith('+94')) {
          setCountryCode('+94');
          setPhone(userPhone.substring(3).replace(/\s/g, ''));
          console.log('Sri Lanka phone detected from user - country code: +94, phone:', userPhone.substring(3));
        } else {
          // For other countries, use generic extraction
          const match = userPhone.match(/^(\+[0-9]{1,3})(.*)$/);
          if (match) {
            setCountryCode(match[1]);
            setPhone(match[2].replace(/\s/g, '')); // Remove spaces from phone number
            console.log('Extracted country code from user:', match[1], 'phone:', match[2]);
          } else {
            setPhone(userPhone.replace(/\s/g, '') || "");
            console.log('No match for country code from user, using full phone:', userPhone);
          }
        }
      } else {
        setPhone(userPhone?.replace(/\s/g, '') || "");
        console.log('User phone does not start with +, using:', userPhone);
      }
      setGender((user as any).gender || "");
      // Format date to yyyy-MM-dd for HTML date input
      const userDob = (user as any).dateOfBirth;
      if (userDob) {
        const dob = new Date(userDob);
        setDateOfBirth(dob.toISOString().split('T')[0]);
      } else {
        setDateOfBirth("");
      }
      setAge((user as any).age ? String((user as any).age) : "");
      console.log('Final state from user - countryCode:', countryCode, 'phone:', phone);
    }
  }, [profile, user]);

  // Calculate age from date of birth
  const calculateAge = (dob: string) => {
    if (!dob) return "";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return String(age);
  };

  // Update age when date of birth changes
  useEffect(() => {
    if (dateOfBirth) {
      setAge(calculateAge(dateOfBirth));
    } else {
      setAge("");
    }
  }, [dateOfBirth]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error("First name and Last name are required.");
      }
      if (!phone.trim()) {
        throw new Error("Phone number is required.");
      }
      if (!dateOfBirth) {
        throw new Error("Date of birth is required.");
      }
      const ageNum = Number(age);
      if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        throw new Error("Please enter a valid date of birth.");
      }

      const response = await fetch(`/api/patients/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: `${countryCode}${phone.trim().replace(/\s/g, '')}`,
          gender,
          dateOfBirth,
          age: ageNum,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update profile');
      return result.data;
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      qc.invalidateQueries({ queryKey: ["patient-profile", user?._id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update profile.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate();
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to change password');
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error("Please enter your password to confirm account deletion.");
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          password: deletePassword,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to delete account');
      toast.success("Account deleted successfully!");
      setShowDeleteDialog(false);
      setDeletePassword("");
      // Redirect to login page after successful deletion
      window.location.href = '/auth/login';
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();

  return (
    <div style={{ background: '#f7f8fa', minHeight: '100vh', padding: '0' }}>
      {/* Header */}
      <div className="header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '28px clamp(16px, 4vw, 48px)',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="avatar" style={{
            width: '72px',
            height: '72px',
            minWidth: '72px',
            borderRadius: '50%',
            background: '#e2e3e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600',
            fontSize: '1.15rem',
            color: '#4a4a4a'
          }}>
            {initials}
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: '0', color: '#3a3a3a', fontWeight: '400', wordBreak: 'break-word' }}>
              {firstName} {lastName}
            </h1>
            <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#4a4a4a' }}>
              {user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="reset-btn"
          style={{
            background: '#4a4a4a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            padding: '10px 18px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {isEditing ? 'Cancel editing' : 'Edit profile'}
        </button>
      </div>

      {/* Card */}
      <div className="card" style={{
        background: '#ffffff',
        margin: '0 clamp(12px, 3vw, 32px) 32px',
        borderRadius: '6px',
        padding: 'clamp(16px, 3vw, 36px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <style dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 640px) {
              .columns-responsive { grid-template-columns: 1fr !important; gap: 8px !important; }
            }
          `
        }} />
        <div className="columns columns-responsive" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px'
        }}>
          {/* LEFT COLUMN */}
          <div>
            <section className="block" style={{ marginBottom: '36px' }}>
              <h2 className="section-title" style={{ fontSize: '1.05rem', color: '#3a3a3a', margin: '0 0 14px', fontWeight: '700' }}>
                User details
              </h2>

              {!isEditing ? (
                <>
                  <div className="field-label" style={{ fontWeight: '700', color: '#3a3a3a', margin: '14px 0 4px', fontSize: '0.95rem' }}>
                    Name
                  </div>
                  <p className="field-value" style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>
                    {firstName} {lastName}
                  </p>

                  <div className="field-label" style={{ fontWeight: '700', color: '#3a3a3a', margin: '14px 0 4px', fontSize: '0.95rem' }}>
                    Email address
                  </div>
                  <p className="field-value" style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>
                    <a href={`mailto:${user?.email}`} style={{ color: '#d98a1d', textDecoration: 'none', fontSize: '0.95rem' }}>
                      {user?.email}
                    </a>
                  </p>

                  <div className="field-label" style={{ fontWeight: '700', color: '#3a3a3a', margin: '14px 0 4px', fontSize: '0.95rem' }}>
                    Phone
                  </div>
                  <p className="field-value" style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>
                    {phone ? `${countryCode} ${phone}` : 'Not specified'}
                  </p>

                  <div className="field-label" style={{ fontWeight: '700', color: '#3a3a3a', margin: '14px 0 4px', fontSize: '0.95rem' }}>
                    Gender
                  </div>
                  <p className="field-value" style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>
                    {gender ? gender.charAt(0).toUpperCase() + gender.slice(1).replace(/_/g, ' ') : 'Not specified'}
                  </p>

                  <div className="field-label" style={{ fontWeight: '700', color: '#3a3a3a', margin: '14px 0 4px', fontSize: '0.95rem' }}>
                    Date of Birth
                  </div>
                  <p className="field-value" style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>
                    {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not specified'}
                  </p>

                  <div className="field-label" style={{ fontWeight: '700', color: '#3a3a3a', margin: '14px 0 4px', fontSize: '0.95rem' }}>
                    Age
                  </div>
                  <p className="field-value" style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>
                    {age ? `${age} years old` : 'Not specified'}
                  </p>
                </>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      placeholder="John"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      placeholder="Doe"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <CountryCodeSelector value={countryCode} onChange={setCountryCode} />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        placeholder="77 123 4567"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      required
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="" disabled>Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer Not to Say</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      min="1"
                      max="120"
                      value={age}
                      disabled
                      placeholder="30"
                      className="rounded-xl bg-slate-100 cursor-not-allowed"
                    />
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs text-amber-700">Age is automatically calculated from date of birth</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-200">
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="gap-2 rounded-xl px-5 bg-slate-800 hover:bg-slate-900"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          Save Profile
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            <section className="block" style={{ marginBottom: '36px' }}>
              <h2 className="section-title" style={{ fontSize: '1.05rem', color: '#3a3a3a', margin: '0 0 14px', fontWeight: '700' }}>
                Security
              </h2>
              <ul className="link-list" style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                <li style={{ marginBottom: '10px' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setShowPasswordDialog(true); }} style={{ color: '#d98a1d', textDecoration: 'none', fontSize: '0.95rem', cursor: 'pointer' }}>
                    Change password
                  </a>
                </li>
                <li style={{ marginBottom: '10px' }}>
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    style={{ color: '#dc2626', textDecoration: 'none', fontSize: '0.95rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0' }}
                  >
                    Delete account
                  </button>
                </li>
              </ul>
            </section>

            <section className="block" style={{ marginBottom: '36px' }}>
              <h2 className="section-title" style={{ fontSize: '1.05rem', color: '#3a3a3a', margin: '0 0 14px', fontWeight: '700' }}>
                Login activity
              </h2>
              <div className="field-label" style={{ fontWeight: '700', color: '#3a3a3a', margin: '14px 0 4px', fontSize: '0.95rem' }}>
                Account created
              </div>
              <p className="field-value" style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Enter your password to confirm</Label>
              <Input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Dialog */}
      <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Password</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your current password and new password to update your credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handlePasswordChange(e); }} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </form>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowPasswordDialog(false);
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handlePasswordChange(e);
              }}
              disabled={passwordLoading}
              className="bg-slate-800 hover:bg-slate-900"
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
