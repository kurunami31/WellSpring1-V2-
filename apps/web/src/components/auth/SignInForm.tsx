import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { DEMO_PASSWORD, DEMO_USERS } from "@/data/demo";
import { cn } from "@/lib/utils";
import { PasswordField } from "./PasswordField";

const QUICK_ACCOUNTS = [
  DEMO_USERS.find((account) => account.role === "SYSTEM_ADMIN")!,
  DEMO_USERS.find((account) => account.role === "CASHIER")!,
  DEMO_USERS.find((account) => account.role === "BRANCH_MANAGER")!,
];

export function SignInForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@wellspring.ph");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form className="mt-7" onSubmit={submit} noValidate>
        {error && <div role="alert" className="mb-5 rounded-xl bg-[#fae9e7] px-4 py-3 text-sm text-[#a12c2c]">{error}</div>}
        <div>
          <label className="field-label" htmlFor="login-email">Work email</label>
          <input className="text-input" id="login-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="mt-5">
          <PasswordField id="login-password" name="password" label="Password" value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
        </div>
        <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting || !email || !password}>
          {submitting ? "Checking account…" : <>Open workstation<ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></>}
        </Button>
      </form>

      <div className="mt-7 border-t border-[#dce8ee] pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#486581]">Fill a demo account</p>
        <div className="mt-3 grid gap-2">
          {QUICK_ACCOUNTS.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => { setEmail(account.email); setPassword(DEMO_PASSWORD); setError(""); }}
              className={cn(
                "flex min-h-14 items-center justify-between rounded-xl bg-[#f6fafc] px-4 py-2 text-left transition-colors hover:bg-[#e5f5f1]",
                email === account.email && "bg-[#e5f5f1] text-[#102a43]",
              )}
            >
              <span><span className="block text-sm font-semibold capitalize">{account.role.replaceAll("_", " ").toLowerCase()}</span><span className="block text-xs text-[#486581]">{account.email}</span></span>
              {email === account.email && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-[#087f8c]" />}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-[#486581]">Seeded accounts use <code className="rounded bg-[#e5f5f1] px-1.5 py-0.5 font-mono text-[#102a43]">password123</code>. No real customer or patient data is used.</p>
      </div>
    </>
  );
}
