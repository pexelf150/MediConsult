import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Stethoscope,
  ArrowRight,
  Phone,
  Mail,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-config";
import { useState, useRef } from "react";

import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/auth-form";
import { ForgotPasswordModal } from "@/components/forgot-password-modal";

import heroSkyline from "@/assets/background 2.jpg";
import logo from "@/assets/logo.jpeg";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Premedi Lanka — Online Doctor Consultations" },
      {
        name: "description",
        content:
          "Talk to a licensed doctor over secure video. Urgent care in minutes or schedule a normal visit.",
      },
    ],
  }),
  component: Landing,
});


const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};


const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};


function Landing() {

  const navigate = useNavigate();

  const { data: doctors } = useQuery({
    queryKey: ["landing-doctors"],
    queryFn: async () => {
      const response = await fetch(apiUrl('/doctors'), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch doctors');
      const result = await response.json();
      return Array.isArray(result.data?.doctors) ? result.data.doctors : [];
    },
  });

  // Get the first doctor with contact info, prioritizing those with address
  const doctorsArray = Array.isArray(doctors) ? doctors : [];
  const doctorWithInfo = doctorsArray.find((d: any) => d.address) || doctorsArray[0];
  const doctorPhone = doctorWithInfo?.phone || "1-800-MEDI-NOW";
  const doctorEmail = doctorWithInfo?.contactEmail || doctorWithInfo?.email || "care@mediconsult.health";
  const doctorAddress = doctorWithInfo?.address || "100 Medical Plaza, Suite 400, San Francisco, CA 94143";
  const [authRole, setAuthRole] = useState<"patient" | "doctor">("patient");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const handleAuthSuccess = (role?: string) => {
    if (role === "doctor") {
      window.location.href = "/doctor";
    } else {
      window.location.href = "/patient";
    }
  };

  const scrollToAuthForm = (role: "patient" | "doctor") => {
    setAuthRole(role);
    // Use ID-based scrolling to avoid hydration issues
    setTimeout(() => {
      const authFormElement = document.getElementById('auth-form-section');
      if (authFormElement) {
        authFormElement.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };


  return (
    <div className="min-h-screen bg-background text-foreground relative isolate">
      {/* Background Image */}
      <div className="fixed inset-0 -z-10">
        <img
          src={heroSkyline}
          alt="Background"
          className="h-full w-full object-cover"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Top utility bar */}
      <div className="hidden bg-[oklch(0.18_0.04_220)] text-xs text-white/80 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> 24/7 Urgent line: {doctorPhone}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {doctorEmail}
            </span>
          </div>
          <span className="text-white/60">Licensed physicians · HIPAA-aligned</span>
        </div>
      </div>

      {/* Transparent Glass Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/20 bg-white/10 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Premedi Lanka Logo" className="h-14 w-[84px] rounded-lg object-cover" />
            <div className="leading-tight">
              <div className="text-xl tracking-tight text-white">
                Premedi Lanka
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                Online Care
              </div>
            </div>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative isolate overflow-hidden min-h-screen">
        {/* Hero Content */}
        <div className="mx-auto max-w-7xl px-6 pt-14 pb-32 md:pt-24">

          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">


            {/* Left Content */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={stagger}
              className="max-w-2xl text-white"
            >

              <motion.span
                variants={fadeUp}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur"
              >

                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />

                Trusted Telehealth Provider

              </motion.span>



              <motion.h1
                variants={fadeUp}
                className="mt-6 text-5xl leading-[1.05] tracking-tight md:text-6xl lg:text-7xl"
              >

                Online Doctor
                <br />

                <span className="text-[oklch(0.85_0.10_195)]">
                  Consultations
                </span>

              </motion.h1>



              <motion.div
                variants={fadeUp}
                className="mt-4 text-sm font-semibold uppercase tracking-[0.3em] text-white/70"
              >

                For Every Patient — Anywhere

              </motion.div>



              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-xl text-base text-white/80 md:text-lg"
              >

                Board-certified physicians on secure video. Book a scheduled visit
                or get urgent care in minutes — with instant doctor notification
                and a private meeting link.

              </motion.p>



              <motion.div
                variants={fadeUp}
                className="mt-10 flex flex-wrap gap-3"
              >

                <Button
                  size="lg"
                  className="group h-12 px-6 shadow-xl shadow-primary/30"
                  onClick={() => scrollToAuthForm("patient")}
                >

                    Book a consultation

                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />

                </Button>



                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/30 bg-white/10 px-6 text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
                  onClick={() => scrollToAuthForm("doctor")}
                >

                    I'm a doctor

                </Button>


              </motion.div>


            </motion.div>





            {/* Login Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center justify-center"
            >

              <motion.div layout className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl" id="auth-form-section">


                <div className="mb-6 text-center">

                  <h2 className="text-2xl font-semibold text-emerald-700">
                    Welcome to Premedi Lanka
                  </h2>


                  <p className="mt-2 text-sm text-muted-foreground">
                    Sign in or create an account to get started
                  </p>

                </div>


                <AuthForm 
                  onSuccess={handleAuthSuccess} 
                  initialRole={authRole} 
                  onForgotPassword={() => setForgotPasswordOpen(true)}
                />


              </motion.div>


            </motion.div>


          </div>

        </div>


      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[oklch(0.12_0.02_220)] text-white" style={{ fontFamily: 'sans-serif' }}>
        <div className="mx-auto max-w-[1200px] px-[60px] py-12">
          <div className="flex flex-wrap justify-between gap-10">
            <div className="flex-1 min-w-[320px] max-w-[420px]">
              <Link to="/" className="flex items-center gap-3 mb-5">
                <img src={logo} alt="Premedi Lanka Logo" className="h-10 w-[70px] rounded-lg object-cover" />
                <span className="text-[22px]  tracking-wide text-white">Premedi Lanka</span>
              </Link>
              <p className="text-sm text-white/80 mb-3.5 leading-relaxed">
                {doctorPhone}
              </p>
              <p className="text-sm text-white/80 mb-3.5 leading-relaxed">
                {doctorEmail}
              </p>
              <p className="text-sm text-white/80 mb-3.5 leading-relaxed">
                Operating Hours: 24/7
              </p>
              <p className="text-sm text-white/80 leading-relaxed">
                {doctorAddress}
              </p>
            </div>
            <div className="flex-0 min-w-[180px]">
              <h4 className="text-base font-bold text-white mb-[18px]">Other</h4>
              <ul className="space-y-3.5 text-sm">
                <li><a href="#" className="text-white/80 hover:text-white transition-colors">Terms and Conditions</a></li>
                <li><a href="#" className="text-white/80 hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="text-white/80 hover:text-white transition-colors">Feedback</a></li>
                <li><a href="#" className="text-white/80 hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            <div className="flex-0 min-w-[180px]">
              <h4 className="text-base font-bold text-white mb-[18px]">About</h4>
              <ul className="space-y-3.5 text-sm">
                <li><a href="#" className="text-white/80 hover:text-white transition-colors">The Company</a></li>
                <li><a href="#" className="text-white/80 hover:text-white transition-colors">Services</a></li>
                <li><a href="#" className="text-white/80 hover:text-white transition-colors">Partners</a></li>
                <li><a href="#" className="text-white/80 hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/60">
            <span>© {new Date().getFullYear()} Premedi Lanka. All rights reserved.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>

      <ForgotPasswordModal open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />
    </div>
  );
}