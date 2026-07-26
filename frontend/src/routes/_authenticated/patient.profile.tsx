import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { User, Mail, Phone, Calendar, Users, Save, Loader2, Shield } from "lucide-react";
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
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["patient-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      const parts = (profile.full_name || "").split(/\s+/);
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
      setPhone(profile.phone || "");
      setGender(profile.gender || "");
      setAge(profile.age ? String(profile.age) : "");
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error("First name and Last name are required.");
      }
      if (!phone.trim()) {
        throw new Error("Phone number is required.");
      }
      const ageNum = Number(age);
      if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        throw new Error("Please enter a valid age between 1 and 120.");
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone.trim(),
          gender,
          age: ageNum,
        })
        .eq("id", user!.id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      qc.invalidateQueries({ queryKey: ["patient-profile", user?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update profile.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate();
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
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal details, gender, age, and contact information.
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
              {profile?.full_name || "Patient Profile"}
            </h2>
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-widest bg-emerald-50 rounded-full px-2.5 py-0.5 inline-block mt-2">
              Patient
            </p>
            <div className="mt-6 border-t border-emerald-50 pt-6 text-left text-sm text-muted-foreground space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>HIPAA-Aligned Profile</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Profile Details Form & Password Change */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-emerald-100 bg-card p-6 shadow-soft">
            <form onSubmit={handleSubmit} className="space-y-6">
              <h3 className="text-lg font-semibold text-foreground border-b pb-3 border-emerald-50">
                Personal Details
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
                      placeholder="John"
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
                      placeholder="Doe"
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
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="+1 (555) 123-4567"
                      className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600 pointer-events-none" />
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      required
                      className="h-10 w-full rounded-xl border border-emerald-100 bg-emerald-50/30 pl-10 pr-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <option value="" disabled>Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer Not to Say</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                    <Input
                      id="age"
                      type="number"
                      min="1"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                      placeholder="30"
                      className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                    />
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
      const { error } = await supabase.auth.changePassword(currentPassword, newPassword);
      if (error) throw error;
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
