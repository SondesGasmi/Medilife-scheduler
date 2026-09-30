import { useMemo, useState } from "react";
import { AlertCircle, Database, LoaderCircle, LockKeyhole, UsersRound } from "lucide-react";
import {
  getGetAdminDatabaseSnapshotQueryKey,
  useGetAdminDatabaseSnapshot,
} from "@workspace/api-client-react";

type DataTab = "users" | "assignments" | "schedules";

const tabs: Array<{ id: DataTab; label: string }> = [
  { id: "users", label: "Utilisateurs" },
  { id: "assignments", label: "Affectations" },
  { id: "schedules", label: "Plannings" },
];

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function roleLabel(role: string) {
  return role.replaceAll("_", " ");
}

export default function AdminDatabasePage() {
  const [tab, setTab] = useState<DataTab>("users");
  const query = useGetAdminDatabaseSnapshot({
    query: { queryKey: getGetAdminDatabaseSnapshotQueryKey(), retry: false },
  });
  const snapshot = query.data;
  const users = snapshot?.users ?? [];
  const assignments = snapshot?.assignments ?? [];
  const schedules = snapshot?.schedules ?? [];
  const staffById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  return (
    <div className="animate-enter">
      <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#36858b]">Administration</span>
            <span className="h-px w-8 bg-[#9dc4c6]" />
          </div>
          <h1 className="font-display text-[42px] leading-[.95] tracking-[-.045em] text-foreground md:text-[52px]">Données de la base</h1>
          <p className="mt-3 max-w-[650px] text-sm leading-6 text-muted-foreground">Vue en lecture seule des membres, affectations de garde et créneaux enregistrés dans Supabase.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-lg border border-[#e5d4a7] bg-[#fffaf0] px-3 py-2 text-[11px] text-[#80652e] md:self-auto">
          <LockKeyhole size={14} />
          Vue de diagnostic · accès à sécuriser avant production
        </div>
      </div>

      {query.isLoading && <div className="flex min-h-64 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm text-muted-foreground"><LoaderCircle size={17} className="animate-spin" /> Lecture de Supabase…</div>}

      {query.isError && <div role="alert" className="flex items-start gap-3 rounded-xl border border-[#ecc7c5] bg-[#fdf1f0] p-5 text-sm text-[#a93d39]"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Impossible de charger les données.</p><p className="mt-1 text-xs leading-5">Vérifiez que le schéma MediLife et la migration `user_constraints` ont été appliqués dans Supabase.</p></div></div>}

      {snapshot && <>
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs"><div className="flex items-center gap-2 text-muted-foreground"><UsersRound size={15} /><span className="font-mono-ui text-[10px] uppercase tracking-[.14em]">Utilisateurs</span></div><p className="mt-2 font-display text-3xl">{users.length}</p><p className="mt-1 text-[11px] text-muted-foreground">Fiches du personnel</p></div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs"><div className="flex items-center gap-2 text-muted-foreground"><Database size={15} /><span className="font-mono-ui text-[10px] uppercase tracking-[.14em]">Affectations</span></div><p className="mt-2 font-display text-3xl">{assignments.length}</p><p className="mt-1 text-[11px] text-muted-foreground">Créneaux avec un membre affecté</p></div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs"><div className="flex items-center gap-2 text-muted-foreground"><Database size={15} /><span className="font-mono-ui text-[10px] uppercase tracking-[.14em]">Créneaux planning</span></div><p className="mt-2 font-display text-3xl">{schedules.length}</p><p className="mt-1 text-[11px] text-muted-foreground">Toutes les lignes de schedule_slots</p></div>
        </div>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-sm font-semibold">Tables MediLife</h2><p className="mt-1 text-[11px] text-muted-foreground">Données lues directement depuis l’API serveur Supabase</p></div>
            <div className="flex rounded-lg border border-input bg-background p-0.5" role="tablist" aria-label="Choisir les données">
              {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`rounded-md px-3 py-2 text-[11px] font-medium transition-colors ${tab === item.id ? "bg-[#e1eff0] text-[#266d75]" : "text-muted-foreground hover:text-foreground"}`}>{item.label}<span className="ml-1.5 font-mono-ui text-[9px] opacity-70">{item.id === "users" ? users.length : item.id === "assignments" ? assignments.length : schedules.length}</span></button>)}
            </div>
          </div>

          <div className="overflow-x-auto">
            {tab === "users" && <table className="w-full min-w-[900px] text-left"><thead className="bg-[#f5f8f8]"><tr className="border-b border-border">{["Nom", "E-mail", "Rôle", "Heures max.", "Repos min.", "Nuits d’affilée", "Nuit autorisée", "Statut"].map((label) => <th key={label} className="px-4 py-3 font-mono-ui text-[9px] uppercase tracking-[.12em] text-muted-foreground">{label}</th>)}</tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-border/70 last:border-0"><td className="whitespace-nowrap px-4 py-3 text-xs font-semibold">{user.full_name}</td><td className="px-4 py-3 text-xs text-muted-foreground">{user.email}</td><td className="px-4 py-3 text-xs capitalize">{roleLabel(user.role)}</td><td className="px-4 py-3 text-xs">{user.constraints.max_hours_per_week} h</td><td className="px-4 py-3 text-xs">{user.constraints.min_rest_hours} h</td><td className="px-4 py-3 text-xs">{user.constraints.max_consecutive_nights}</td><td className="px-4 py-3 text-xs">{user.constraints.can_work_night ? "Oui" : "Non"}</td><td className="px-4 py-3 text-xs">{user.is_active ? "Actif" : "Inactif"}</td></tr>)}</tbody></table>}

            {tab === "assignments" && <table className="w-full min-w-[720px] text-left"><thead className="bg-[#f5f8f8]"><tr className="border-b border-border">{["Date", "Membre", "Type de garde", "Statut", "Verrouillé"].map((label) => <th key={label} className="px-5 py-3 font-mono-ui text-[9px] uppercase tracking-[.12em] text-muted-foreground">{label}</th>)}</tr></thead><tbody>{assignments.map((item) => <tr key={item.id} className="border-b border-border/70 last:border-0"><td className="px-5 py-3 text-xs">{formatDate(item.shift_date)}</td><td className="px-5 py-3 text-xs font-semibold">{item.staff_name}</td><td className="px-5 py-3 text-xs">{roleLabel(item.shift_type)}</td><td className="px-5 py-3 text-xs capitalize">{roleLabel(item.status)}</td><td className="px-5 py-3 text-xs">{item.is_locked ? "Oui" : "Non"}</td></tr>)}</tbody></table>}

            {tab === "schedules" && <table className="w-full min-w-[760px] text-left"><thead className="bg-[#f5f8f8]"><tr className="border-b border-border">{["Date", "Créneau", "Membre", "Statut", "Verrouillé", "Notes"].map((label) => <th key={label} className="px-5 py-3 font-mono-ui text-[9px] uppercase tracking-[.12em] text-muted-foreground">{label}</th>)}</tr></thead><tbody>{schedules.map((slot) => <tr key={slot.id} className="border-b border-border/70 last:border-0"><td className="px-5 py-3 text-xs">{formatDate(slot.shift_date)}</td><td className="px-5 py-3 text-xs">{roleLabel(slot.shift_type)}</td><td className="px-5 py-3 text-xs">{slot.staff_id ? staffById.get(slot.staff_id)?.full_name ?? "Membre introuvable" : "Non affecté"}</td><td className="px-5 py-3 text-xs capitalize">{roleLabel(slot.status)}</td><td className="px-5 py-3 text-xs">{slot.is_locked ? "Oui" : "Non"}</td><td className="max-w-60 truncate px-5 py-3 text-xs text-muted-foreground">{slot.notes ?? "—"}</td></tr>)}</tbody></table>}

            {((tab === "users" && users.length === 0) || (tab === "assignments" && assignments.length === 0) || (tab === "schedules" && schedules.length === 0)) && <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center"><Database size={20} className="text-[#39858c]" /><p className="mt-3 text-sm font-semibold">Aucune donnée à afficher</p><p className="mt-1 text-xs text-muted-foreground">Cette table Supabase ne contient aucune ligne.</p></div>}
          </div>
        </section>
      </>}
    </div>
  );
}