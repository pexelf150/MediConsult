import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { User, Mail, Phone, Calendar, Users, Save, Loader2, Shield, Cake } from "lucide-react";
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
      // Extract country code from phone number if it exists
      if (profile.phone && profile.phone.startsWith('+')) {
        const match = profile.phone.match(/^(\+[0-9]{1,3})(.*)$/);
        if (match) {
          setCountryCode(match[1]);
          setPhone(match[2]);
        } else {
          setPhone(profile.phone || "");
        }
      } else {
        setPhone(profile.phone || "");
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
    } else if (user) {
      // Fallback to useAuth user data if profile API fails
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      // Extract country code from phone number if it exists
      const userPhone = (user as any).phone;
      if (userPhone && userPhone.startsWith('+')) {
        const match = userPhone.match(/^(\+[0-9]{1,3})(.*)$/);
        if (match) {
          setCountryCode(match[1]);
          setPhone(match[2]);
        } else {
          setPhone(userPhone || "");
        }
      } else {
        setPhone(userPhone || "");
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
          phone: `${countryCode}${phone.trim()}`,
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

  if (authLoading || profileLoading) {
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
              {firstName} {lastName},
              <br />
              <span className="font-semibold">I&apos;m a Patient</span>
            </h1>
            <div className="flex flex-wrap gap-6 mt-4 text-sm text-emerald-50">
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> {user?.email}
              </span>
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> {countryCode} {phone}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> {age} years old
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xs font-semibold tracking-wide text-slate-400 mb-4">
                PERSONAL DETAILS
              </h2>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <div className="space-y-2">
                      <CountryCodeSelector value={countryCode} onChange={setCountryCode} />
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          placeholder="77 123 4567"
                          className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

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
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <div className="relative">
                      <Cake className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        required
                        className="pl-10 rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                      />
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
                        disabled
                        placeholder="30"
                        className="pl-10 rounded-xl bg-muted/40 border-muted-foreground/10 text-muted-foreground cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Age is automatically calculated from date of birth</p>
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
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xs font-semibold tracking-wide text-slate-400 mb-4">
                PROFILE INFO
              </h2>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-sm">HIPAA-Aligned Profile</p>
                      <p className="text-xs text-muted-foreground">Your data is protected</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-sm">Patient Account</p>
                      <p className="text-xs text-muted-foreground">Active since registration</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
