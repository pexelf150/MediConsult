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
  visible: {
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
  visible: {
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
              whileInView="visible"
              viewport={{ once: false, amount: 0.3 }}
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
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.3 }}
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
      <motion.footer
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.3 }}
        variants={stagger}
        className="relative z-10"
        style={{ background: '#00070B', fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif", color: '#ffffff' }}
      >
        <div className="mx-auto max-w-[1280px]" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {/* LEFT COLUMN - BRANDING */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            style={{ padding: '40px 32px', borderRight: '1px solid #5a6772', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #5a6772' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src={logo} alt="King's Hospital Logo" style={{ height: '80px', width: 'auto', marginBottom: '20px' }} />
              <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#ffffff', maxWidth: '340px', textAlign: 'center' }}>
                Your health matters, and so does your connection with us. Join the King's Hospital community - where care meets community, and well-being is our priority
              </p>
              <div style={{ marginTop: '32px', fontSize: '0.78rem', color: '#c7ced3', lineHeight: '1.7', textAlign: 'center' }}>
                © All rights reserved. Kings Hospital. 2026<br />
                Design and Developed By TekGeeks
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            style={{ padding: '40px 32px' }}
          >
            <div style={{ marginBottom: '26px' }}>
              <label style={{ display: 'block', color: '#f5a623', fontSize: '0.85rem', letterSpacing: '1px', marginBottom: '6px' }}>EMAIL</label>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.4' }}>{doctorEmail}</p>
            </div>
            <div style={{ marginBottom: '26px' }}>
              <label style={{ display: 'block', color: '#f5a623', fontSize: '0.85rem', letterSpacing: '1px', marginBottom: '6px' }}>LOCATION</label>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.4' }}>{doctorAddress}</p>
            </div>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6">
                <path d="M12 4a8 8 0 0 0-8 8c0 1.8.6 3.4 1.6 4.7L4 20l3.5-1.4A8 8 0 1 0 12 4z"/>
                <text x="12" y="12.5" fontSize="6.5" fill="white" stroke="none" textAnchor="middle" fontWeight="700">24</text>
              </svg>
            </div>
            <div style={{ marginBottom: '26px' }}>
              <label style={{ display: 'block', color: '#f5a623', fontSize: '0.85rem', letterSpacing: '1px', marginBottom: '6px' }}>HOTLINE</label>
              <p style={{ margin: 0, fontSize: '1.3rem', letterSpacing: '1px' }}>{doctorPhone}</p>
            </div>
          </motion.div>
        </div>
        <style>{`
          @media (max-width: 900px) {
            footer > div {
              grid-template-columns: 1fr !important;
            }
            footer > div > div {
              border-right: none !important;
              border-bottom: 1px solid #5a6772 !important;
            }
          }
        `}</style>
      </motion.footer>

      <ForgotPasswordModal open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />
    </div>
  );
}