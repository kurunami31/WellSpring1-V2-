import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Cross } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";
const DEMO_SIGNUP_AVAILABLE = import.meta.env.VITE_USE_API !== "true";

function Brand({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", inverse ? "bg-white text-[#087f8c]" : "bg-[#087f8c] text-white", compact && "h-10 w-10")}>
        <Cross aria-hidden="true" className="h-5 w-5" />
      </span>
      <div>
        <p className="font-display text-lg font-bold tracking-[-0.02em]">WellSpring One</p>
        <p className={cn("text-[11px] font-medium uppercase tracking-[0.14em]", inverse ? "text-[#b8cede]" : "text-[#486581]")}>Pharmacy operations</p>
      </div>
    </div>
  );
}

function inactiveAttributes(active: boolean): Record<string, string> {
  return active ? {} : { inert: "", "aria-hidden": "true" };
}

export default function LoginPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const switched = useRef(false);
  const isSignIn = mode === "signin";
  const isSignUp = mode === "signup" && DEMO_SIGNUP_AVAILABLE;

  useEffect(() => {
    if (switched.current) headingRef.current?.focus();
  }, [mode]);

  if (user) return <Navigate to="/dashboard" replace />;

  const changeMode = (nextMode: AuthMode) => {
    if (nextMode === mode) return;
    switched.current = true;
    setMode(nextMode);
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f2f7fa] px-4 py-6 sm:px-6 sm:py-8 lg:flex lg:items-center lg:justify-center lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-[#ddf4ee]/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#e3f0fa]/80 blur-3xl" />

      <div className="relative mx-auto w-full max-w-[1120px]">
        <div className="mb-5 flex items-center justify-between gap-3 px-1">
          <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#486581] hover:text-[#102a43]"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to overview</Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b8299]">Staff access</span>
        </div>
        <div className="mb-6 px-1 lg:hidden"><Brand compact /></div>

        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.12)]">
          {DEMO_SIGNUP_AVAILABLE && (
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#edf4f7] p-1 lg:hidden" role="group" aria-label="Authentication options">
              <button type="button" aria-pressed={isSignIn} aria-controls="signin-panel" onClick={() => changeMode("signin")} className={cn("min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors", isSignIn ? "bg-white text-[#102a43] shadow-sm" : "text-[#486581] hover:text-[#102a43]")}>Sign in</button>
              <button type="button" aria-pressed={isSignUp} aria-controls="signup-panel" onClick={() => changeMode("signup")} className={cn("min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors", isSignUp ? "bg-white text-[#102a43] shadow-sm" : "text-[#486581] hover:text-[#102a43]")}>Create account</button>
            </div>
          )}

          <div className="relative lg:grid lg:min-h-[720px] lg:grid-cols-2">
            <section
              id="signin-panel"
              aria-labelledby="signin-title"
              {...inactiveAttributes(isSignIn)}
              className={cn("auth-form-panel min-w-0 px-6 py-8 sm:px-10 sm:py-10 lg:block lg:px-12 lg:py-11", isSignIn ? "block" : "hidden lg:invisible")}
            >
              <p className="eyebrow">Branch workstation</p>
              <h1 id="signin-title" ref={isSignIn ? headingRef : undefined} tabIndex={-1} className="mt-2 font-display text-3xl font-bold tracking-[-0.03em] text-[#102a43] sm:text-4xl">Sign in to your shift</h1>
              <p className="mt-3 text-sm leading-6 text-[#486581]">Use a seeded account or return to a demo account you created on this device.</p>
              <SignInForm />
            </section>

            {DEMO_SIGNUP_AVAILABLE && (
              <section
                id="signup-panel"
                aria-labelledby="signup-title"
                {...inactiveAttributes(isSignUp)}
                className={cn("auth-form-panel min-w-0 px-6 py-8 sm:px-10 sm:py-10 lg:block lg:px-12 lg:py-11", isSignUp ? "block" : "hidden lg:invisible")}
              >
                <p className="eyebrow">Local demo account</p>
                <h1 id="signup-title" ref={isSignUp ? headingRef : undefined} tabIndex={-1} className="mt-2 font-display text-3xl font-bold tracking-[-0.03em] text-[#102a43] sm:text-4xl">Create your demo account</h1>
                <p className="mt-3 text-sm leading-6 text-[#486581]">Set up a cashier profile, then go straight to your WellSpring dashboard.</p>
                <SignUpForm />
              </section>
            )}

            <aside className={cn("absolute inset-y-0 left-0 z-10 hidden w-1/2 flex-col justify-between overflow-hidden bg-[#102a43] p-12 text-white transition-transform duration-700 [transition-timing-function:var(--ease-out)] lg:flex", isSignIn ? "translate-x-full" : "translate-x-0")} aria-label="WellSpring account options">
              <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[48px] border-[#087f8c]/20" />
              <div aria-hidden="true" className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#087f8c]/15 blur-2xl" />
              <div className="relative"><Brand inverse /></div>

              <div key={mode} className="auth-overlay-content relative max-w-md py-10">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8ee6cf]">{isSignIn ? "New to the prototype?" : "Already have an account?"}</p>
                <h2 className="mt-4 font-display text-4xl font-bold leading-[1.12] tracking-[-0.035em] xl:text-5xl">{isSignIn ? "Start your own demo shift." : "Welcome back to the counter."}</h2>
                <p className="mt-5 text-base leading-7 text-[#c8dce8]">{isSignIn ? "Create a browser-only cashier profile and explore sales, stock, and offline receipts with shared demo data." : "Sign in with a seeded staff profile or a demo account you already created on this device."}</p>
                {DEMO_SIGNUP_AVAILABLE && (
                  <Button type="button" size="lg" aria-controls={isSignIn ? "signup-panel" : "signin-panel"} onClick={() => changeMode(isSignIn ? "signup" : "signin")} className="mt-7 bg-white text-[#102a43] shadow-lg hover:bg-[#ddf4ee]">
                    {isSignIn ? "Create account" : "Sign in"}<ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <ul className="mt-9 space-y-3 text-sm text-[#d9edf3]">
                  {["Shared sales and stock records", "Role-aware workstation access", "Offline receipts ready to sync"].map((item) => <li key={item} className="flex items-center gap-3"><Check aria-hidden="true" className="h-4 w-4 shrink-0 text-[#8ee6cf]" />{item}</li>)}
                </ul>
              </div>

              <p className="relative text-xs leading-5 text-[#9fb8c9]">Functional prototype · WS01 Davao Main · Register 01<br />Browser-only sign-up is not production authentication.</p>
            </aside>
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-[#526f84]">WellSpring One · POS / Inventory / Supplier · Demo data stays on this device.</p>
        <p className="mt-2 text-center text-xs text-[#526f84]">Demo: admin@wellspring.ph · password123</p>
      </div>
    </main>
  );
}
