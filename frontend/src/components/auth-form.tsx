import { useState } from "react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stethoscope, User as UserIcon, Loader2, Mail, Lock, ArrowRight, Phone, Calendar, Users } from "lucide-react";
import { toast } from "sonner";

interface AuthFormProps {
  onSuccess?: (role?: string) => void;
  initialRole?: "patient" | "doctor";
  onForgotPassword?: () => void;
}

export function AuthForm({ onSuccess, initialRole, onForgotPassword }: AuthFormProps) {
  const navigate = useNavigate();
  const [role, setRole] = useState<"patient" | "doctor">(initialRole || "patient");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("General Practitioner");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [doctorCode, setDoctorCode] = useState("");
  const [doctorVerified, setDoctorVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isSignIn = mode === "signin";

  const handleDoctorCodeVerify = () => {
    if (doctorCode === "59") {
      setDoctorVerified(true);
      toast.success("Doctor code verified successfully");
    } else {
      toast.error("Invalid doctor code");
    }
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole as "patient" | "doctor");
    if (newRole === "patient") {
      setDoctorVerified(true);
    } else {
      setDoctorVerified(false);
      setDoctorCode("");
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        if (role === "patient") {
          if (!fullName.trim() || !phone.trim() || !gender || !dateOfBirth) {
            toast.error("Please fill in your full name, date of birth, gender and contact number.");
            setSubmitting(false);
            return;
          }
          // Use backend API for patient registration
          const nameParts = fullName.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const response = await fetch('/api/auth/patient/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email,
              password,
              firstName,
              lastName,
              phone,
              dateOfBirth,
              gender,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.message || 'Registration failed');
          }

          // Store user data in localStorage
          if (result.data?.user) {
            localStorage.setItem('user', JSON.stringify(result.data.user));
            localStorage.setItem('userId', result.data.user._id || result.data.user.id);
            localStorage.setItem('userRole', result.data.user.role);
          }

          toast.success("Account created — please sign in with your credentials.");
          setMode("signin");
          setPassword("");
          setFullName("");
          setDateOfBirth("");
          setGender("");
          setPhone("");
        } else if (role === "doctor") {
          // Use backend API for doctor registration
          const nameParts = fullName.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          const response = await fetch('/api/auth/doctor/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email,
              password,
              firstName,
              lastName,
              specialization: specialty,
              licenseNumber: 'DOC-' + Date.now(), // Generate a temporary license number
            }),
          });
          
          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.message || 'Registration failed');
          }

          // Store user data in localStorage
          if (result.data?.user) {
            localStorage.setItem('user', JSON.stringify(result.data.user));
            localStorage.setItem('userId', result.data.user._id || result.data.user.id);
            localStorage.setItem('userRole', result.data.user.role);
          }

          toast.success("Account created — please sign in with your credentials.");
          setMode("signin");
          setPassword("");
          setFullName("");
          setSpecialty("General Practitioner");
          if (onSuccess) onSuccess(role);
        }
      } else {
        // Sign in using backend API
        const endpoint = role === "doctor" ? "/api/auth/doctor/login" : "/api/auth/patient/login";
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });
        
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Login failed');
        }

        // Store user data in localStorage
        if (result.data?.user) {
          localStorage.setItem('user', JSON.stringify(result.data.user));
          localStorage.setItem('userId', result.data.user._id || result.data.user.id);
          localStorage.setItem('userRole', result.data.user.role);
        }

        toast.success("Welcome back!");
        if (onSuccess) onSuccess(role);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      // Use backend API for Google OAuth
      const response = await fetch('/api/auth/google/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          redirectTo: window.location.origin,
          role: role,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to get Google auth URL');
      }
      
      // Redirect to Google auth URL
      window.location.href = result.data.url;
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-6">
        <Tabs value={role} onValueChange={handleRoleChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-full bg-emerald-50">
            <TabsTrigger value="patient" className="gap-1.5 rounded-full data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <UserIcon className="h-3.5 w-3.5" /> Patient
            </TabsTrigger>
            <TabsTrigger value="doctor" className="gap-1.5 rounded-full data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Stethoscope className="h-3.5 w-3.5" /> Doctor
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Doctor Code Verification Screen */}
      {role === "doctor" && !doctorVerified && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="text-center">
            <h3 className="text-lg font-semibold text-emerald-700">Doctor Verification</h3>
            <p className="text-sm text-muted-foreground mt-1">Enter your doctor code to continue</p>
          </div>
          <PillInput
            id="doctorCode"
            type="text"
            placeholder="Enter doctor code"
            value={doctorCode}
            onChange={setDoctorCode}
            icon={<Lock className="h-4 w-4" />}
            required
          />
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="button"
              onClick={handleDoctorCodeVerify}
              disabled={!doctorCode}
              className="h-11 w-full rounded-full bg-emerald-600 text-sm font-semibold tracking-wider shadow-md hover:bg-emerald-700"
            >
              Verify Code
            </Button>
          </motion.div>
        </motion.div>
      )}

      {/* Auth Form - Only show if verified or patient */}
      {(role === "patient" || doctorVerified) && (
        <>
      <div className="mb-6 flex items-center justify-center gap-4">
        <motion.button
          type="button"
          onClick={() => setMode("signin")}
          className={`text-sm font-medium transition-colors ${isSignIn ? "text-emerald-700" : "text-muted-foreground"}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Sign In
        </motion.button>
        <div className="h-px flex-1 bg-emerald-200" />
        <motion.button
          type="button"
          onClick={() => setMode("signup")}
          className={`text-sm font-medium transition-colors ${!isSignIn ? "text-emerald-700" : "text-muted-foreground"}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Sign Up
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${role}-${mode}`}
          initial={{ opacity: 0, x: isSignIn ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isSignIn ? 20 : -20 }}
          transition={{ duration: 0.3 }}
        >
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <PillInput
                  id="name"
                  placeholder="Full name"
                  value={fullName}
                  onChange={setFullName}
                  icon={<UserIcon className="h-4 w-4" />}
                  required
                />
              </motion.div>
            )}
            {mode === "signup" && role === "patient" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Label htmlFor="dateOfBirth" className="sr-only">Date of Birth</Label>
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required
                      className="h-11 rounded-full border-0 bg-emerald-50 pl-11 pr-4 text-sm text-emerald-900 placeholder:text-emerald-700/50 focus-visible:ring-2 focus-visible:ring-emerald-500"
                    />
                  </div>
                  <div className="relative">
                    <Label htmlFor="gender" className="sr-only">Gender</Label>
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600">
                      <Users className="h-4 w-4" />
                    </div>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      required
                      className="h-11 w-full appearance-none rounded-full border-0 bg-emerald-50 pl-11 pr-4 text-sm text-emerald-900 placeholder:text-emerald-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <option value="" disabled>Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <PillInput
                  id="phone"
                  type="tel"
                  placeholder="Contact number"
                  value={phone}
                  onChange={setPhone}
                  icon={<Phone className="h-4 w-4" />}
                  required
                />
              </motion.div>
            )}
            {mode === "signup" && role === "doctor" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <PillInput
                  id="specialty"
                  placeholder="Specialty"
                  value={specialty}
                  onChange={setSpecialty}
                  icon={<Stethoscope className="h-4 w-4" />}
                  required
                />
              </motion.div>
            )}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <PillInput
                id="email"
                type="email"
                placeholder="Email............"
                value={email}
                onChange={setEmail}
                icon={<Mail className="h-4 w-4" />}
                required
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <PillInput
                id="password"
                type="password"
                placeholder="Password............"
                value={password}
                onChange={setPassword}
                icon={<Lock className="h-4 w-4" />}
                required
                minLength={6}
              />
            </motion.div>

            {mode === "signin" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <button 
                  type="button" 
                  onClick={onForgotPassword}
                  className="text-xs text-muted-foreground hover:text-emerald-700"
                >
                  Forgot your password?
                </button>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="relative"
            >
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-emerald-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="button"
                onClick={handleGoogleAuth}
                disabled={googleLoading}
                variant="outline"
                className="h-11 w-full rounded-full border-emerald-200 bg-white text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-50 hover:border-emerald-300"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full rounded-full bg-emerald-600 text-sm font-semibold tracking-wider shadow-md hover:bg-emerald-700"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {mode === "signin" ? "LOG IN" : "SIGN UP"}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </motion.div>
      </AnimatePresence>
        </>
      )}
    </div>
  );
}

function PillInput({
  id, type = "text", placeholder, value, onChange, icon, required, minLength,
}: {
  id: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="relative">
      <Label htmlFor={id} className="sr-only">{placeholder}</Label>
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600">
        {icon}
      </div>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="h-11 rounded-full border-0 bg-emerald-50 pl-11 pr-4 text-sm placeholder:text-emerald-700/50 focus-visible:ring-2 focus-visible:ring-emerald-500"
      />
    </div>
  );
}
