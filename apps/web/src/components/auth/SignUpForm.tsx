import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import type { DemoSignupInput } from "@/lib/demo-auth";
import { PasswordField } from "./PasswordField";

const EMPTY_SIGNUP: DemoSignupInput = { name: "", email: "", password: "", confirmPassword: "" };

export function SignUpForm() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [details, setDetails] = useState<DemoSignupInput>(EMPTY_SIGNUP);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof DemoSignupInput) => (event: ChangeEvent<HTMLInputElement>) => {
    setDetails((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup(details);
      navigate("/dashboard", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create the demo account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="mt-7" onSubmit={submit} noValidate>
      {error && <div role="alert" className="mb-5 rounded-xl bg-[#fae9e7] px-4 py-3 text-sm text-[#a12c2c]">{error}</div>}
      <div>
        <label className="field-label" htmlFor="signup-name">Full name</label>
        <input className="text-input" id="signup-name" name="name" type="text" autoComplete="name" required value={details.name} onChange={update("name")} placeholder="Juan Dela Cruz" />
      </div>
      <div className="mt-4">
        <label className="field-label" htmlFor="signup-email">Work email</label>
        <input className="text-input" id="signup-email" name="email" type="email" autoComplete="email" required value={details.email} onChange={update("email")} placeholder="juan@example.com" />
      </div>
      <div className="mt-4">
        <PasswordField id="signup-password" name="new-password" label="Password" value={details.password} autoComplete="new-password" hint="Use at least 8 characters for this demo account." onChange={update("password")} />
      </div>
      <div className="mt-4">
        <PasswordField id="signup-confirm-password" name="confirm-password" label="Confirm password" value={details.confirmPassword} autoComplete="new-password" onChange={update("confirmPassword")} />
      </div>
      <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
        {submitting ? "Creating demo account…" : <>Create account &amp; start shift<ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></>}
      </Button>
      <div className="mt-5 flex items-start gap-3 rounded-xl bg-[#e5f5f1] p-4 text-xs leading-5 text-[#28536a]">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#087f8c]" />
        <p><strong className="font-semibold text-[#102a43]">Demo only.</strong> This creates a cashier account for WS01 · Davao Main in this browser. Do not use a real password.</p>
      </div>
    </form>
  );
}
