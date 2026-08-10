import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { User, Mail, Phone, Stethoscope, Briefcase, Save, Loader2, Info, CheckCircle2, XCircle } from "lucide-react";
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
  const [specialty, setSpecialty] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");

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
      setFirstName(doctor.firstName || "");
      setLastName(doctor.lastName || "");
      setPhone(doctor.phone || "");
      setSpecialty(doctor.specialization || "");
      setExperienceYears(doctor.experienceYears ? String(doctor.experienceYears) : "");
      setBio(doctor.bio || "");
      setAddress(doctor.address || "");
      setContactEmail(doctor.contactEmail || "");
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
        phone: phone.trim(),
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

  if (authLoading || doctorLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl tracking-tight text-foreground">Profile Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your professional details, clinical status, and consultation fees.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Left Side: Avatar Card */}
        <div className="md:col-span-1">
          <div className="rounded-2xl border border-emerald-100 bg-card p-6 text-center shadow-soft">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-2xl font-bold text-emerald-700 border-2 border-emerald-200">
              {initials || <User className="h-10 w-10 text-emerald-600" />}
            </div>
            <h2 className="mt-4 text-xl font-semibold text-foreground">
              Dr. {doctor?.full_name || "Doctor Profile"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {specialty || "Medical Specialist"}
            </p>
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-widest bg-emerald-50 rounded-full px-2.5 py-0.5 inline-block mt-3">
              Doctor
            </p>

            <div className="mt-6 border-t border-emerald-50 pt-6 text-left text-sm text-muted-foreground space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Licensed Physician</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Profile Details Form & Password Change */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-emerald-100 bg-card p-6 shadow-soft">
            <form onSubmit={handleSubmit} className="space-y-6">
              <h3 className="text-lg font-semibold text-foreground border-b pb-3 border-emerald-50">
                Professional Details
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
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
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
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
                  <p className="text-[10px] text-muted-foreground">Email address cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 987-6543"
                      className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
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
              </div>

              <div className="space-y-2">
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

              <div className="space-y-2">
                <Label htmlFor="address">Clinic Address (Optional)</Label>
                <div className="relative">
                  <Info className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Healthcare Street, Medical District, City 12345"
                    className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email (Optional)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="doctor@clinic.com"
                    className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                  />
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

          {/* Change Password Card */}
          <div className="rounded-2xl border border-emerald-100 bg-card p-6 shadow-soft">
            <PasswordChangeForm />
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
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
      setLoading(false);
    }
  };

  return (
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
          disabled={loading}
          className="gap-2 rounded-xl px-5 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-700/10"
        >
          {loading ? (
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
  );
}
