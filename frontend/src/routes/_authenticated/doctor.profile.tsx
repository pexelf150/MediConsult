import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { User, Mail, Phone, Stethoscope, Briefcase, Save, Loader2, Info, Shield, Trash2 } from "lucide-react";
import CountryCodeSelector from "@/components/country-code-selector";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor/profile")({
  component: DoctorProfile,
});

function DoctorProfile() {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+94");
  const [specialty, setSpecialty] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: ["doctor-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(apiUrl('/auth/me'), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch doctor profile');
      const result = await response.json();
      return result.data?.user || result.data;
    },
  });

  useEffect(() => {
    if (doctor) {
      console.log('Doctor data from API:', doctor);
      console.log('Doctor phone from API:', doctor.phone);
      setFirstName(doctor.firstName || "");
      setLastName(doctor.lastName || "");
      // Extract country code from phone number if it exists
      if (doctor.phone && doctor.phone.startsWith('+')) {
        // Handle Sri Lanka specifically: +94 followed by phone number
        if (doctor.phone.startsWith('+94')) {
          setCountryCode('+94');
          setPhone(doctor.phone.substring(3).replace(/\s/g, ''));
          console.log('Sri Lanka phone detected - country code: +94, phone:', doctor.phone.substring(3));
        } else {
          // For other countries, use generic extraction
          const match = doctor.phone.match(/^(\+[0-9]{1,3})(.*)$/);
          if (match) {
            setCountryCode(match[1]);
            setPhone(match[2].replace(/\s/g, '')); // Remove spaces from phone number
            console.log('Extracted country code:', match[1], 'phone:', match[2]);
          } else {
            setPhone(doctor.phone.replace(/\s/g, '') || "");
            console.log('No match for country code, using full phone:', doctor.phone);
          }
        }
      } else {
        setPhone(doctor.phone?.replace(/\s/g, '') || "");
        console.log('Phone does not start with +, using:', doctor.phone);
      }
      setSpecialty(doctor.specialization || "");
      setExperienceYears(doctor.experienceYears ? String(doctor.experienceYears) : "");
      setBio(doctor.bio || "");
      setAddress(doctor.address || "");
      setContactEmail(doctor.contactEmail || "");
      console.log('Final state - countryCode:', countryCode, 'phone:', phone);
    }
  }, [doctor]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error("First name and Last name are required.");
      }
      if (!specialty.trim()) {
        throw new Error("Specialty is required.");
      }
      const expNum = Number(experienceYears);
      if (isNaN(expNum) || expNum < 0) {
        throw new Error("Please enter a valid number of experience years.");
      }

      const updateData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: `${countryCode}${phone.trim().replace(/\s/g, '')}`,
        specialization: specialty.trim(),
        bio: bio.trim(),
        experienceYears: expNum,
        address: address.trim(),
        contactEmail: contactEmail.trim(),
      };
      console.log('Sending update data:', updateData);

      const response = await fetch(apiUrl('/auth/me'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update doctor profile');
      }

      const result = await response.json();
      console.log('Update response:', result);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Doctor profile updated successfully!");
      qc.invalidateQueries({ queryKey: ["doctor-profile", user?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update doctor profile.");
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

  if (authLoading || doctorLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();

  return (
    <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-lg">
        {/* Header */}
        <div className="bg-slate-800 px-8 py-8 flex items-center gap-6">
          <div className="w-24 h-24 rounded-full border-4 border-white/60 overflow-hidden shrink-0 bg-emerald-200">
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-emerald-700">
              {initials || <User className="h-12 w-12 text-emerald-600" />}
            </div>
          </div>
          <div className="text-white">
            <h1 className="text-2xl font-light">
              Dr. {firstName} {lastName},
              <br />
              <span className="font-semibold">I&apos;m a {specialty || "Medical Specialist"}</span>
            </h1>
            <div className="flex flex-wrap gap-6 mt-4 text-sm text-emerald-50">
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> {user?.email}
              </span>
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> {countryCode} {phone}
              </span>
              <span className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" /> {experienceYears} Years Experience
              </span>
            </div>
          </div>
        </div>

        {/* Body with Tabs */}
        <div className="p-8">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="personal">Personal Details</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="animate-in slide-in-from-left-4 fade-in-10 duration-300">
              <div>
                <h2 className="text-xs font-semibold tracking-wide text-slate-400 mb-4">
                  PROFESSIONAL DETAILS
                </h2>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                          <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            placeholder="Jane"
                            className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                          <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                            placeholder="Smith"
                            className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                          <Input
                            id="email"
                            type="email"
                            value={user?.email || ""}
                            disabled
                            className="pl-10 rounded-xl bg-muted/40 border-muted-foreground/10 text-muted-foreground cursor-not-allowed"
                          />
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs text-amber-700">Email address cannot be changed</p>
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="phone">Contact Number</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <CountryCodeSelector value={countryCode} onChange={setCountryCode} />
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                            <Input
                              id="phone"
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="77 123 4567"
                              className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="specialty">Specialization</Label>
                        <div className="relative">
                          <Stethoscope className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                          <Input
                            id="specialty"
                            value={specialty}
                            onChange={(e) => setSpecialty(e.target.value)}
                            required
                            placeholder="General Practitioner"
                            className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="experience">Years of Experience</Label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                          <Input
                            id="experience"
                            type="number"
                            min="0"
                            value={experienceYears}
                            onChange={(e) => setExperienceYears(e.target.value)}
                            required
                            placeholder="8"
                            className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="bio">Professional Biography</Label>
                        <div className="relative">
                          <Info className="absolute left-3 top-3 h-4 w-4 text-emerald-600" />
                          <Textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Brief description of your education, specialization, and clinical experience..."
                            className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500 min-h-[120px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">Clinic Address</Label>
                        <div className="relative">
                          <Info className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                          <Input
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                            placeholder="123 Healthcare Street, Medical District, City 12345"
                            className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Contact Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                          <Input
                            id="contactEmail"
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            required
                            placeholder="doctor@clinic.com"
                            className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                          />
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs text-amber-700">This email address is designated to receive notifications for urgent consultations.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-emerald-50">
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="gap-2 rounded-xl px-5 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-700/10"
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" /> Save Profile
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="animate-in slide-in-from-right-4 fade-in-10 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column - Change Password */}
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-xs font-semibold tracking-wide text-slate-400 mb-4">
                      CHANGE PASSWORD
                    </h2>
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                      <form onSubmit={handlePasswordChange} className="space-y-6">
                        <h3 className="text-lg font-semibold text-foreground border-b pb-3 border-emerald-50">
                          Change Password
                        </h3>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input
                              id="currentPassword"
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              required
                              placeholder="••••••••"
                              className="rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                            />
                          </div>

                          <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="newPassword">New Password</Label>
                              <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="confirmPassword">Confirm New Password</Label>
                              <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-emerald-50">
                          <Button
                            type="submit"
                            disabled={passwordLoading}
                            className="gap-2 rounded-xl px-5 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-700/10"
                          >
                            {passwordLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" /> Update Password
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>

                {/* Right column - Security Info */}
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-xs font-semibold tracking-wide text-slate-400 mb-4">
                      SECURITY INFO
                    </h2>
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-emerald-600" />
                          <div>
                            <p className="font-medium text-sm">Secure Account</p>
                            <p className="text-xs text-muted-foreground">Your account is protected</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-emerald-600" />
                          <div>
                            <p className="font-medium text-sm">Password Requirements</p>
                            <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-emerald-600" />
                          <div>
                            <p className="font-medium text-sm">Last Login</p>
                            <p className="text-xs text-muted-foreground">Secure authentication</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold tracking-wide text-slate-400 mb-4">
                      DANGER ZONE
                    </h2>
                    <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Trash2 className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="font-medium text-sm">Delete Account</p>
                            <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          className="w-full gap-2"
                          onClick={() => setShowDeleteDialog(true)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
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
    </div>
  );
}
