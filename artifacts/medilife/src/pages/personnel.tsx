import { useMemo, useState } from "react";
import { AlertCircle, Check, Mail, Pencil, Phone, Plus, RefreshCw, Search, Trash2, UserRound, UsersRound } from "lucide-react";
import type { Staff, StaffInput, StaffUpdate } from "@workspace/api-client-react";
import { StaffDialog } from "@/components/staff-dialog";
import { useStaffWorkspace } from "@/hooks/use-staff";

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

const roleLabels: Record<Staff["role"], string> = {
  radiologue: "Radiologue",
  medecin: "Médecin",
  manipulateur_radio: "Manipulateur radio",
  technicien: "Technicien",
  secretaire: "Secrétaire",
  administrateur: "Administrateur",
};

function StatCard({ label, value, hint, accent, loading }: { label: string; value: number; hint: string; accent: string; loading: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-md">
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="flex items-start justify-between">
        <p className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-muted-foreground">{label}</p>
        <span className={`size-2 rounded-full ${accent}`} />
      </div>
      {loading ? <div className="skeleton mt-3 h-9 w-20 rounded-md" /> : <p className="mt-2 font-display text-[36px] leading-none tracking-[-.04em] text-foreground" data-testid={`stat-value-${label.toLowerCase().replaceAll(" ", "-")}`}>{value}</p>}
      <p className="mt-3 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function StaffRow({ staff, onEdit, onDelete }: { staff: Staff; onEdit: (staff: Staff) => void; onDelete: (staff: Staff) => void }) {
  return (
    <tr className="group border-b border-border/70 transition-colors last:border-0 hover:bg-[#f5f9f9]" data-testid={`row-staff-${staff.id}`}>
      <td className="px-4 py-4 md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#dbecef] text-[11px] font-bold text-[#266773]">{initials(staff.full_name)}</div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground" data-testid={`text-staff-name-${staff.id}`}>{staff.full_name}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{roleLabels[staff.role]}</p>
          </div>
        </div>
      </td>
      <td className="hidden px-5 py-4 md:table-cell">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail size={13} className="text-[#6e9da3]" /><span className="truncate">{staff.email}</span></div>
        {staff.phone && <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground/75"><Phone size={11} className="text-[#9bb2b5]" />{staff.phone}</div>}
      </td>
      <td className="hidden px-5 py-4 lg:table-cell">
        <div className="flex flex-wrap gap-1">
          {staff.specialities.length > 0 ? staff.specialities.map((speciality) => (
            <span key={speciality} className="inline-flex rounded-md bg-[#edf2f3] px-2.5 py-1 text-[11px] font-medium text-[#536b70]">{speciality}</span>
          )) : <span className="text-[11px] text-muted-foreground">Non renseignée</span>}
        </div>
      </td>
      <td className="hidden px-5 py-4 text-center xl:table-cell"><span className="font-mono-ui text-xs text-foreground">{staff.max_shifts_per_week}<span className="text-muted-foreground"> / sem.</span></span></td>
      <td className="px-4 py-4 md:px-5">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${staff.is_active ? "bg-[#e3f3ed] text-[#26765c]" : "bg-[#edf0f1] text-[#687a7c]"}`} data-testid={`status-staff-${staff.id}`}>
          <span className={`size-1.5 rounded-full ${staff.is_active ? "bg-[#43a980]" : "bg-[#8d9a9c]"}`} />{staff.is_active ? "Actif" : "Inactif"}
        </span>
      </td>
      <td className="px-3 py-4 md:px-5">
        <div className="flex justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <button type="button" onClick={() => onEdit(staff)} aria-label={`Modifier ${staff.full_name}`} data-testid={`button-edit-staff-${staff.id}`} className="rounded-md p-2 text-muted-foreground hover:bg-[#e5f0f1] hover:text-[#286e77]"><Pencil size={14} /></button>
          <button type="button" onClick={() => onDelete(staff)} aria-label={`Supprimer ${staff.full_name}`} data-testid={`button-delete-staff-${staff.id}`} className="rounded-md p-2 text-muted-foreground hover:bg-[#f9e9e7] hover:text-[#ae4a44]"><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  );
}

function TableSkeleton() {
  return <div className="space-y-3 p-5">{[1, 2, 3, 4].map((row) => <div key={row} className="flex items-center gap-4"><div className="skeleton size-9 rounded-lg" /><div className="skeleton h-4 w-1/3 rounded" /><div className="skeleton ml-auto h-4 w-20 rounded" /></div>)}</div>;
}

export default function PersonnelPage() {
  const { staffQuery, summaryQuery, createStaff, updateStaff, deleteStaff } = useStaffWorkspace();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);
  const filteredStaff = useMemo(() => staff.filter((member) => {
    const searchMatch = `${member.full_name} ${member.email} ${member.role} ${member.specialities.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase());
    const filterMatch = filter === "all" || (filter === "active" ? member.is_active : !member.is_active);
    return searchMatch && filterMatch;
  }), [staff, search, filter]);

  const summary = summaryQuery.data;
  const openCreate = () => { setSelectedStaff(null); setDialogOpen(true); };
  const openEdit = (member: Staff) => { setSelectedStaff(member); setDialogOpen(true); };
  const submit = (data: StaffInput | StaffUpdate) => {
    if (selectedStaff) {
      updateStaff.mutate({ id: selectedStaff.id, data }, { onSuccess: () => { setDialogOpen(false); setNotice({ type: "success", text: "La fiche a été mise à jour." }); } });
    } else {
      createStaff.mutate({ data: data as StaffInput }, { onSuccess: () => { setDialogOpen(false); setNotice({ type: "success", text: "La fiche a été créée." }); } });
    }
  };
  const remove = (member: Staff) => {
    if (!window.confirm(`Supprimer la fiche de ${member.full_name} ? Cette action est définitive.`)) return;
    deleteStaff.mutate({ id: member.id }, { onSuccess: () => setNotice({ type: "success", text: "La fiche a été supprimée." }) });
  };
  const refresh = () => { setNotice(null); staffQuery.refetch(); summaryQuery.refetch(); };
  const mutationError = createStaff.error || updateStaff.error || deleteStaff.error;

  return (
    <div className="animate-enter">
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2"><span className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#36858b]">Espace administration</span><span className="h-px w-8 bg-[#9dc4c6]" /></div>
          <h1 className="font-display text-[42px] leading-[.95] tracking-[-.045em] text-foreground md:text-[52px]">Personnel médical</h1>
          <p className="mt-3 max-w-[620px] text-sm leading-6 text-muted-foreground">Une vue claire de l’équipe qui fait vivre le centre, de ses spécialités et de ses disponibilités.</p>
        </div>
        <button type="button" onClick={openCreate} data-testid="button-add-staff" className="button-primary self-start lg:self-auto"><Plus size={17} strokeWidth={2.5} /> Ajouter un membre</button>
      </div>

      {notice && <div className="mb-5 flex items-center gap-3 rounded-lg border border-[#b9ddd0] bg-[#eff9f5] px-4 py-3 text-xs font-medium text-[#27735c] animate-enter" data-testid="status-staff-success"><Check size={16} />{notice.text}<button type="button" aria-label="Fermer le message" data-testid="button-dismiss-notice" onClick={() => setNotice(null)} className="ml-auto text-[#589984]">×</button></div>}
      {mutationError && <div className="mb-5 flex items-center gap-3 rounded-lg border border-[#ecc7c5] bg-[#fdf1f0] px-4 py-3 text-xs font-medium text-[#a93d39]" role="alert" data-testid="status-staff-mutation-error"><AlertCircle size={16} /> Impossible d’enregistrer cette modification. Vérifiez les informations puis réessayez.</div>}

      <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Membres" value={summary?.total ?? 0} hint="dans le référentiel" accent="bg-[#4a9ba3]" loading={summaryQuery.isLoading} />
        <StatCard label="Actifs" value={summary?.active ?? 0} hint="disponibles pour les gardes" accent="bg-[#42a884]" loading={summaryQuery.isLoading} />
        <StatCard label="Radiologues" value={summary?.radiologists ?? 0} hint="spécialité référente" accent="bg-[#5575a4]" loading={summaryQuery.isLoading} />
         <StatCard label="Capacité hebdo." value={summary?.available_slots ?? 0} hint="gardes cumulées autorisées" accent="bg-[#c69a4d]" loading={summaryQuery.isLoading} />
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div><div className="flex items-center gap-2"><UsersRound size={17} className="text-[#418f96]" /><h2 className="text-sm font-semibold">Répertoire de l’équipe</h2><span className="rounded-full bg-muted px-2 py-0.5 font-mono-ui text-[10px] text-muted-foreground" data-testid="text-staff-count">{filteredStaff.length}</span></div><p className="mt-1 pl-6 text-[11px] text-muted-foreground">Coordonnées et capacités de garde</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative"><span className="sr-only">Rechercher un membre</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher…" data-testid="input-search-staff" className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-[#4b9da4] focus:ring-2 focus:ring-[#4b9da4]/15 sm:w-[220px]" /></label>
            <div className="flex rounded-lg border border-input bg-background p-0.5" role="group" aria-label="Filtrer par statut">
              {(["all", "active", "inactive"] as const).map((option) => <button type="button" key={option} onClick={() => setFilter(option)} data-testid={`button-filter-${option}`} className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${filter === option ? "bg-[#e1eff0] text-[#266d75]" : "text-muted-foreground hover:text-foreground"}`}>{option === "all" ? "Tous" : option === "active" ? "Actifs" : "Inactifs"}</button>)}
            </div>
            <button type="button" onClick={refresh} aria-label="Actualiser la liste" data-testid="button-refresh-staff" className="flex h-9 items-center justify-center rounded-lg border border-input px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><RefreshCw size={14} /></button>
          </div>
        </div>

        {staffQuery.isLoading ? <TableSkeleton /> : staffQuery.isError ? <div className="flex min-h-[290px] flex-col items-center justify-center px-5 text-center"><div className="flex size-11 items-center justify-center rounded-full bg-[#fdf1f0] text-[#b04a44]"><AlertCircle size={20} /></div><h3 className="mt-4 text-sm font-semibold">Le répertoire est indisponible</h3><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Le schéma MediLife n’est pas encore installé dans Supabase. Appliquez le script SQL fourni avec le projet, puis relancez la synchronisation.</p><button type="button" onClick={() => staffQuery.refetch()} data-testid="button-retry-staff" className="button-secondary mt-4"><RefreshCw size={14} /> Réessayer</button></div> : filteredStaff.length === 0 ? <div className="blueprint-grid flex min-h-[290px] flex-col items-center justify-center px-5 text-center"><div className="flex size-14 items-center justify-center rounded-2xl border border-[#b8d7d9] bg-[#e7f2f3] text-[#39858c]"><UserRound size={24} /></div><h3 className="mt-4 text-sm font-semibold">{staff.length === 0 ? "Le répertoire est prêt à accueillir votre équipe" : "Aucun membre ne correspond"}</h3><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{staff.length === 0 ? "Ajoutez le premier membre médical pour commencer à structurer vos gardes." : "Essayez un autre nom, une autre spécialité ou retirez le filtre actif."}</p>{staff.length === 0 && <button type="button" onClick={openCreate} data-testid="button-empty-add-staff" className="button-primary mt-5"><Plus size={15} /> Ajouter le premier membre</button>}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="bg-[#f5f8f8]"><tr className="border-b border-border"><th className="px-4 py-3 font-mono-ui text-[9px] uppercase tracking-[.15em] text-muted-foreground md:px-5">Membre</th><th className="hidden px-5 py-3 font-mono-ui text-[9px] uppercase tracking-[.15em] text-muted-foreground md:table-cell">Coordonnées</th><th className="hidden px-5 py-3 font-mono-ui text-[9px] uppercase tracking-[.15em] text-muted-foreground lg:table-cell">Spécialité</th><th className="hidden px-5 py-3 text-center font-mono-ui text-[9px] uppercase tracking-[.15em] text-muted-foreground xl:table-cell">Capacité</th><th className="px-4 py-3 font-mono-ui text-[9px] uppercase tracking-[.15em] text-muted-foreground md:px-5">Statut</th><th className="px-3 py-3 md:px-5"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filteredStaff.map((member) => <StaffRow key={member.id} staff={member} onEdit={openEdit} onDelete={remove} />)}</tbody></table></div>}
        <div className="flex items-center justify-between border-t border-border bg-[#fafcfc] px-5 py-3"><p className="font-mono-ui text-[10px] text-muted-foreground">{staff.length > 0 ? `Dernière synchronisation · ${formatDate(new Date().toISOString())}` : "Aucune donnée à synchroniser"}</p><p className="hidden text-[11px] text-muted-foreground sm:block">Les données sont réservées à l’équipe autorisée.</p></div>
      </section>
      <StaffDialog open={dialogOpen} staff={selectedStaff} pending={createStaff.isPending || updateStaff.isPending} onClose={() => setDialogOpen(false)} onSubmit={submit} />
    </div>
  );
}