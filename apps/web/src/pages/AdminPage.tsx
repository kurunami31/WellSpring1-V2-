import { useState, type FormEvent } from "react";
import { KeyRound, Plus, ShieldCheck, UserCheck, X } from "lucide-react";
import { UserRole } from "@wellspring/shared";
import { useAuth } from "@/context/AuthContext";
import { usePrototype } from "@/context/PrototypeContext";
import { EmptyState, Metric, PageHeader, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { formatDateTime } from "@/lib/utils";

export default function AdminPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const { adminUsers, auditLog, addUser, toggleUser } = usePrototype();
  const [tab, setTab] = useState<"USERS" | "AUDIT">("USERS");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.CASHIER);
  const [error, setError] = useState("");
  const canManageUsers = hasPermission("admin:users");
  const activeUsers = adminUsers.filter((user) => user.active).length;
  const administrators = adminUsers.filter((user) => user.role === UserRole.SYSTEM_ADMIN && user.active).length;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      addUser({ name, email, role, branchName: role === UserRole.SYSTEM_ADMIN || role === UserRole.HEAD_OFFICE_MANAGER ? "Head office" : "WS01 · Davao Main" });
      toast({ variant: "success", title: "Staff account created", description: `${email} can now be assigned to a branch workstation.` });
      setName(""); setEmail(""); setRole(UserRole.CASHIER); setShowForm(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create this account.");
    }
  };

  const changeStatus = (userId: string, emailAddress: string) => {
    try {
      toggleUser(userId);
      const account = adminUsers.find((user) => user.id === userId);
      toast({ variant: "success", title: `${emailAddress} ${account?.active ? "deactivated" : "activated"}`, description: "The access change has been written to the audit log." });
    } catch (caught) {
      toast({ variant: "error", title: "Account status unchanged", description: caught instanceof Error ? caught.message : "Try again." });
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Governance · Access and accountability" title="Administration" description="Manage staff access, review role assignments, and inspect the operational audit trail without exposing password or payment secrets." actions={canManageUsers ? <Button onClick={() => setShowForm(!showForm)}>{showForm ? <X aria-hidden="true" className="mr-2 h-4 w-4" /> : <Plus aria-hidden="true" className="mr-2 h-4 w-4" />}{showForm ? "Close form" : "Add staff account"}</Button> : undefined} />
      <section className="mb-6 grid gap-5 border-y border-[#cbdce5] py-5 sm:grid-cols-3" aria-label="Administration summary"><Metric label="Active accounts" value={String(activeUsers)} note={`${adminUsers.length} total staff records`} /><Metric label="System administrators" value={String(administrators)} note="Full configuration access" /><Metric label="Audit events" value={String(auditLog.length)} note="Prototype session and seeded events" /></section>

      <div className="mb-5 flex gap-1 border-b border-[#cbdce5]" role="tablist" aria-label="Administration views">
        <button id="users-tab" type="button" role="tab" aria-selected={tab === "USERS"} aria-controls="users-panel" onClick={() => setTab("USERS")} className={`min-h-11 border-b-2 px-4 text-sm font-semibold ${tab === "USERS" ? "border-[#087f8c] text-[#087f8c]" : "border-transparent text-[#486581]"}`}>Staff accounts</button>
        <button id="audit-tab" type="button" role="tab" aria-selected={tab === "AUDIT"} aria-controls="audit-panel" onClick={() => setTab("AUDIT")} className={`min-h-11 border-b-2 px-4 text-sm font-semibold ${tab === "AUDIT" ? "border-[#087f8c] text-[#087f8c]" : "border-transparent text-[#486581]"}`}>Audit & controls</button>
      </div>

      {tab === "USERS" ? <section id="users-panel" role="tabpanel" aria-labelledby="users-tab">
        {showForm && <section className="mb-6 border-l-4 border-[#087f8c] bg-white p-5" aria-labelledby="new-user-title"><p className="eyebrow">Access provisioning</p><h2 id="new-user-title" className="section-title mt-1">Add a staff account</h2><p className="meta mt-1">New accounts use the branch's temporary-password onboarding process in a production deployment.</p><form onSubmit={submit} className="mt-5 grid items-end gap-4 md:grid-cols-2 xl:grid-cols-4"><div><label className="field-label" htmlFor="new-user-name">Full name</label><input id="new-user-name" className="text-input" required value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" /></div><div><label className="field-label" htmlFor="new-user-email">Work email</label><input id="new-user-email" className="text-input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" /></div><div><label className="field-label" htmlFor="new-user-role">Role</label><select id="new-user-role" className="select-input" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>{Object.values(UserRole).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ").toLowerCase()}</option>)}</select></div><Button type="submit"><UserCheck aria-hidden="true" className="mr-2 h-4 w-4" />Create account</Button>{error && <p role="alert" className="text-sm text-[#a12c2c] md:col-span-2 xl:col-span-4">{error}</p>}</form></section>}
        <div className="table-shell">{adminUsers.length === 0 ? <EmptyState title="No staff accounts" description="Add a staff account to begin assigning branch access." /> : <table className="data-table min-w-[860px]"><thead><tr><th scope="col">Staff member</th><th scope="col">Role</th><th scope="col">Assignment</th><th scope="col">Last activity</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{adminUsers.map((account) => <tr key={account.id}><td><p className="font-semibold text-[#102a43]">{account.name}{account.id === currentUser?.id ? " (you)" : ""}</p><p className="mt-1 text-xs text-[#486581]">{account.email}</p></td><td>{account.role.replaceAll("_", " ").toLowerCase()}</td><td>{account.branchName}</td><td>{formatDateTime(account.lastLogin)}</td><td><StatusBadge status={account.active ? "ACTIVE" : "INACTIVE"} /></td><td className="text-right"><Button variant="outline" size="sm" onClick={() => changeStatus(account.id, account.email)} disabled={!canManageUsers || account.id === currentUser?.id}>{account.active ? "Deactivate" : "Activate"}</Button></td></tr>)}</tbody></table>}</div>
        <p className="mt-3 text-xs text-[#486581]">You cannot deactivate the account currently signed in. Role and status changes are recorded in the audit trail.</p>
      </section> : <section id="audit-panel" role="tabpanel" aria-labelledby="audit-tab">
        <div className="mb-6 grid gap-4 md:grid-cols-3"><article className="panel p-4"><ShieldCheck aria-hidden="true" className="h-5 w-5 text-[#087f8c]" /><h2 className="mt-3 text-sm font-semibold">Role checks</h2><p className="mt-1 text-xs leading-5 text-[#486581]">Backend routes and prototype navigation apply the same permission matrix. Sensitive actions are not hidden by interface checks alone.</p></article><article className="panel p-4"><KeyRound aria-hidden="true" className="h-5 w-5 text-[#087f8c]" /><h2 className="mt-3 text-sm font-semibold">Credential handling</h2><p className="mt-1 text-xs leading-5 text-[#486581]">The backend uses password hashing and expiring JWT sessions. Demo credentials are for local evaluation only.</p></article><article className="panel p-4"><UserCheck aria-hidden="true" className="h-5 w-5 text-[#087f8c]" /><h2 className="mt-3 text-sm font-semibold">Accountability</h2><p className="mt-1 text-xs leading-5 text-[#486581]">Sales, stock counts, receiving, user access, and synchronization events record an actor and timestamp.</p></article></div>
        <div className="table-shell">{auditLog.length === 0 ? <EmptyState title="No audit events yet" description="Operational actions will appear here as they are completed." /> : <table className="data-table min-w-[760px]"><thead><tr><th scope="col">Timestamp</th><th scope="col">Action</th><th scope="col">Details</th><th scope="col">Actor</th></tr></thead><tbody>{auditLog.map((entry) => <tr key={entry.id}><td className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</td><td className="font-semibold text-[#102a43]">{entry.action}</td><td>{entry.detail}</td><td>{entry.actor}</td></tr>)}</tbody></table>}</div>
      </section>}
    </div>
  );
}
