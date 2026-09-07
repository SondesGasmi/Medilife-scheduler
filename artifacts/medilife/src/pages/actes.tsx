import { useMemo, useState } from "react";
import { CircleCheck, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import {
  getListActLogsQueryKey,
  getListRemunerationQueryKey,
  useCreateActLog,
  useDeleteActLog,
  useListActLogs,
  useListActs,
  useListScheduleSlots,
  useListStaff,
  useUpdateActLog,
  type ActLog,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

function formatDA(amount: number) {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} DA`;
}

export default function ActesPage() {
  const queryClient = useQueryClient();
  const [staffId, setStaffId] = useState("");
  const [actId, setActId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState(1);
  const [slotId, setSlotId] = useState("");
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState<ActLog | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const staffQuery = useListStaff();
  const actsQuery = useListActs();
  const slotsQuery = useListScheduleSlots({ from: date, to: date });
  const logsQuery = useListActLogs();
  const createLog = useCreateActLog();
  const updateLog = useUpdateActLog();
  const deleteLog = useDeleteActLog();
  const staff = staffQuery.data ?? [];
  const acts = actsQuery.data ?? [];
  const logs = logsQuery.data ?? [];
  const selectedAct = acts.find((act) => act.id === actId);
  const total = (selectedAct?.base_price ?? 0) * quantity;
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListActLogsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListRemunerationQueryKey() });
  };

  const reset = () => {
    setEditing(null); setStaffId(""); setActId(""); setQuantity(1); setSlotId(""); setNotes("");
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!staffId || !actId || quantity < 1) return;
    setNotice(null);
    const data = { staff_id: staffId, act_id: actId, performed_at: date, quantity, schedule_slot_id: slotId || null, notes: notes.trim() || null };
    const options = { onSuccess: () => { refresh(); reset(); setNotice(editing ? "La saisie a été modifiée." : "L’acte a été enregistré."); }, onError: () => setNotice("La saisie n’a pas pu être enregistrée. Vérifiez les droits Supabase.") };
    if (editing) updateLog.mutate({ id: editing.id, data }, options);
    else createLog.mutate({ data }, options);
  };

  const beginEdit = (log: ActLog) => {
    setEditing(log); setStaffId(log.staff_id); setActId(log.act_id); setDate(log.performed_at); setQuantity(log.quantity); setSlotId(log.schedule_slot_id ?? ""); setNotes(log.notes ?? ""); setNotice(null);
  };

  const deleteEntry = (log: ActLog) => {
    if (!window.confirm("Supprimer cette saisie d’acte ?")) return;
    deleteLog.mutate({ id: log.id }, { onSuccess: () => { refresh(); setNotice("La saisie a été supprimée."); }, onError: () => setNotice("La suppression a échoué.") });
  };

  const labels = useMemo(() => new Map(staff.map((member) => [member.id, member.full_name])), [staff]);
  const actLabels = useMemo(() => new Map(acts.map((act) => [act.id, act.name_fr])), [acts]);
  const pricesAreZero = acts.length > 0 && acts.every((act) => act.base_price === 0);

  return (
    <div className="animate-enter">
      <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><div className="mb-3 flex items-center gap-2"><span className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#36858b]">Activité médicale</span><span className="h-px w-8 bg-[#9dc4c6]" /></div><h1 className="font-display text-[42px] leading-[.95] tracking-[-.045em] text-foreground md:text-[52px]">Saisie des actes</h1><p className="mt-3 max-w-[650px] text-sm leading-6 text-muted-foreground">Enregistrez les actes réalisés pendant une garde. Le montant vient du catalogue Supabase et du trigger de rémunération.</p></div></div>
      {notice && <div role="alert" className="mb-5 rounded-lg border border-[#b9ddd0] bg-[#eff9f5] px-4 py-3 text-xs font-medium text-[#27735c]">{notice}</div>}
      {(staffQuery.isError || actsQuery.isError || logsQuery.isError) && <div role="alert" className="mb-5 rounded-lg border border-[#ecc7c5] bg-[#fdf1f0] px-4 py-3 text-xs font-medium text-[#a93d39]">Le catalogue ou les saisies sont indisponibles. Appliquez le schéma MediLife et vérifiez les droits Supabase.</div>}
      {pricesAreZero && <div className="mb-5 rounded-lg border border-[#e5d4a7] bg-[#fffaf0] px-4 py-3 text-xs text-[#80652e]">Les tarifs du catalogue sont actuellement à 0 DA, conformément au SQL fourni. Remplacez-les directement dans Supabase avant la mise en production.</div>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={submit} className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <div className="mb-5 flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-[#e4eee7] text-[#41826b]"><Plus size={20} /></div><div><h2 className="text-sm font-semibold">{editing ? "Modifier la saisie" : "Nouvel acte"}</h2><p className="text-xs text-muted-foreground">Les montants sont calculés depuis `acts`.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="form-label">Membre du personnel <b>*</b></span><select value={staffId} onChange={(event) => setStaffId(event.target.value)} className="form-input"><option value="">Sélectionner…</option>{staff.filter((member) => member.is_active).map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}</select></label>
            <label><span className="form-label">Acte diagnostique <b>*</b></span><select value={actId} onChange={(event) => setActId(event.target.value)} className="form-input"><option value="">Sélectionner…</option>{acts.filter((act) => act.is_active).map((act) => <option key={act.id} value={act.id}>{act.name_fr}</option>)}</select></label>
            <label><span className="form-label">Date <b>*</b></span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setSlotId(""); }} className="form-input" /></label>
            <label><span className="form-label">Quantité <b>*</b></span><input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} className="form-input" /></label>
            <label className="sm:col-span-2"><span className="form-label">Garde associée</span><select value={slotId} onChange={(event) => setSlotId(event.target.value)} className="form-input"><option value="">Aucune garde liée</option>{(slotsQuery.data ?? []).filter((slot) => slot.staff_id === staffId).map((slot) => <option key={slot.id} value={slot.id}>{slot.shift_type} · {slot.status}</option>)}</select></label>
            <label className="sm:col-span-2"><span className="form-label">Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="form-input" placeholder="Information complémentaire…" /></label>
          </div>
          <div className="mt-5 flex flex-col-reverse justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center"><div><p className="text-[11px] text-muted-foreground">Total estimé</p><p className="font-display text-3xl text-foreground">{formatDA(total)}</p></div><div className="flex gap-2">{editing && <button type="button" onClick={reset} className="button-secondary">Annuler</button>}<button type="submit" disabled={!staffId || !actId || createLog.isPending || updateLog.isPending} className="button-primary">{(createLog.isPending || updateLog.isPending) ? <LoaderCircle size={15} className="animate-spin" /> : <CircleCheck size={15} />}{editing ? "Enregistrer" : "Enregistrer l’acte"}</button></div></div>
        </form>

        <section className="rounded-xl border border-border bg-card p-5 shadow-xs"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Historique récent</h2><p className="mt-1 text-[11px] text-muted-foreground">{logs.length} saisie(s) chargée(s)</p></div></div>{logs.length === 0 ? <div className="blueprint-grid flex min-h-[220px] flex-col items-center justify-center rounded-lg px-5 text-center"><p className="text-sm font-semibold">Aucune saisie</p><p className="mt-1 text-xs text-muted-foreground">Les actes enregistrés apparaîtront ici.</p></div> : <ul className="space-y-3">{logs.slice(0, 12).map((log) => <li key={log.id} className="rounded-lg border border-border/80 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold">{labels.get(log.staff_id) ?? "Membre supprimé"}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{actLabels.get(log.act_id) ?? "Acte supprimé"}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Date(log.performed_at).toLocaleDateString("fr-FR")} · ×{log.quantity}</p></div><span className="shrink-0 text-xs font-semibold">{formatDA(log.total_amount)}</span></div><div className="mt-2 flex justify-end gap-1"><button type="button" onClick={() => beginEdit(log)} aria-label="Modifier" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={13} /></button><button type="button" onClick={() => deleteEntry(log)} aria-label="Supprimer" className="rounded-md p-1.5 text-muted-foreground hover:bg-[#f9e9e7] hover:text-[#ae4a44]"><Trash2 size={13} /></button></div></li>)}</ul>}</section>
      </div>
    </div>
  );
}