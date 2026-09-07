import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Plus, RefreshCw, Trash2, Unlock } from "lucide-react";
import {
  getListScheduleSlotsQueryKey,
  getListStaffQueryKey,
  useCreateScheduleSlot,
  useDeleteScheduleSlot,
  useGenerateSchedule,
  useListScheduleSlots,
  useListStaff,
  useUpdateScheduleSlot,
  type ScheduleSlot,
  type ShiftType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const shiftRows: Array<{ type: ShiftType; label: string; time: string }> = [
  { type: "journee_complete", label: "Journée complète", time: "08h – 20h" },
  { type: "garde_jour", label: "Garde jour", time: "08h – 20h" },
  { type: "garde_nuit", label: "Garde nuit", time: "20h – 08h" },
  { type: "repos", label: "Repos", time: "—" },
];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function formatRange(from: Date, to: Date) {
  return `${from.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} – ${to.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
}

export default function PlanningPage() {
  const queryClient = useQueryClient();
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [notice, setNotice] = useState<string | null>(null);
  const [draggedStaff, setDraggedStaff] = useState<string | null>(null);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(week, index)), [week]);
  const from = dateKey(days[0]);
  const to = dateKey(days[6]);
  const staffQuery = useListStaff();
  const slotsQuery = useListScheduleSlots({ from, to });
  const createSlot = useCreateScheduleSlot();
  const updateSlot = useUpdateScheduleSlot();
  const deleteSlot = useDeleteScheduleSlot();
  const generate = useGenerateSchedule();
  const staff = staffQuery.data ?? [];
  const slots = slotsQuery.data ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListScheduleSlotsQueryKey({ from, to }) });
  const slotFor = (date: string, shiftType: ShiftType) => slots.find((slot) => slot.shift_date === date && slot.shift_type === shiftType);

  const assign = (date: string, shiftType: ShiftType, staffId: string, existing?: ScheduleSlot) => {
    setNotice(null);
    if (staffId === "") {
      if (existing) deleteSlot.mutate({ id: existing.id }, { onSuccess: refresh, onError: () => setNotice("Impossible de supprimer ce créneau.") });
      return;
    }
    if (existing) {
      updateSlot.mutate({ id: existing.id, data: { staff_id: staffId } }, { onSuccess: refresh, onError: () => setNotice("Ce créneau est peut-être verrouillé ou en conflit.") });
    } else {
      createSlot.mutate({ data: { staff_id: staffId, shift_date: date, shift_type: shiftType, status: "planifie", is_locked: false } }, { onSuccess: refresh, onError: () => setNotice("Impossible de créer ce créneau.") });
    }
  };

  const generateSchedule = (fullReset: boolean) => {
    if (fullReset && !window.confirm("Réinitialiser toute la période, y compris les cellules verrouillées ?")) return;
    setNotice(null);
    generate.mutate({ data: { from, to, full_reset: fullReset } }, {
      onSuccess: () => { refresh(); setNotice(fullReset ? "La période a été réinitialisée et régénérée." : "Les cellules non verrouillées ont été régénérées."); },
      onError: () => setNotice("La génération n’a pas pu être appliquée. Vérifiez le schéma et les droits Supabase."),
    });
  };

  return (
    <div className="animate-enter">
      <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2"><span className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-[#36858b]">Organisation des gardes</span><span className="h-px w-8 bg-[#9dc4c6]" /></div>
          <h1 className="font-display text-[42px] leading-[.95] tracking-[-.045em] text-foreground md:text-[52px]">Planning des gardes</h1>
          <p className="mt-3 max-w-[650px] text-sm leading-6 text-muted-foreground">Affectez l’équipe, verrouillez les décisions manuelles et régénérez uniquement ce qui reste disponible.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => generateSchedule(false)} disabled={generate.isPending} className="button-primary"><RefreshCw size={15} className={generate.isPending ? "animate-spin" : ""} /> Régénérer les cellules libres</button>
          <button type="button" onClick={() => generateSchedule(true)} disabled={generate.isPending} className="button-secondary">Réinitialiser la période</button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setWeek(addDays(week, -7))} aria-label="Semaine précédente" className="rounded-lg border border-input p-2 text-muted-foreground hover:bg-muted"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => setWeek(startOfWeek(new Date()))} className="button-secondary">Aujourd’hui</button>
          <button type="button" onClick={() => setWeek(addDays(week, 7))} aria-label="Semaine suivante" className="rounded-lg border border-input p-2 text-muted-foreground hover:bg-muted"><ChevronRight size={16} /></button>
          <span className="ml-2 text-sm font-semibold capitalize">{formatRange(days[0], days[6])}</span>
        </div>
        <p className="text-xs text-muted-foreground">Glissez un membre vers une cellule pour déplacer son affectation.</p>
      </div>

      {notice && <div role="alert" className="mb-5 rounded-lg border border-[#ecc7c5] bg-[#fdf1f0] px-4 py-3 text-xs font-medium text-[#a93d39]">{notice}</div>}
      {(staffQuery.isError || slotsQuery.isError) && <div role="alert" className="mb-5 rounded-lg border border-[#ecc7c5] bg-[#fdf1f0] px-4 py-3 text-xs font-medium text-[#a93d39]">Le planning nécessite le schéma MediLife et des droits Supabase actifs.</div>}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-44 border-b border-r border-border bg-[#f5f8f8] p-3 text-left font-mono-ui text-[9px] uppercase tracking-[.15em] text-muted-foreground">Créneau</th>
                {days.map((day) => <th key={dateKey(day)} className="border-b border-border bg-[#f5f8f8] p-3 text-center text-xs font-semibold text-foreground"><span className="block capitalize">{day.toLocaleDateString("fr-FR", { weekday: "short" })}</span><span className="mt-1 block font-mono-ui text-[11px] font-normal text-muted-foreground">{day.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {shiftRows.map((shift) => <tr key={shift.type}>
                <td className="sticky left-0 z-10 border-b border-r border-border bg-card p-3 align-top"><span className="block text-xs font-semibold text-foreground">{shift.label}</span><span className="mt-1 block text-[11px] text-muted-foreground">{shift.time}</span></td>
                {days.map((day) => {
                  const date = dateKey(day);
                  const slot = slotFor(date, shift.type);
                  const currentStaff = staff.find((member) => member.id === slot?.staff_id);
                  return <td key={`${date}-${shift.type}`} onDragOver={(event) => event.preventDefault()} onDrop={() => draggedStaff && assign(date, shift.type, draggedStaff, slot)} className="border-b border-border/70 p-1.5 align-top">
                    <div className={`min-h-[88px] rounded-lg border p-2 ${slot?.is_locked ? "border-[#d9b86d] bg-[#fffaf0]" : "border-dashed border-[#c7d9da] bg-[#fbfdfd]"}`}>
                      <div className="flex items-start gap-2">
                        <select value={slot?.staff_id ?? ""} onChange={(event) => assign(date, shift.type, event.target.value, slot)} disabled={shift.type === "repos" || Boolean(slot?.is_locked)} aria-label={`${shift.label} ${date}`} className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 text-xs font-medium text-foreground outline-none hover:border-input focus:border-[#4b9da4]">
                          <option value="">{shift.type === "repos" ? "Repos" : "Affecter…"}</option>
                          {staff.filter((member) => member.is_active).map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}
                        </select>
                        {slot && <button type="button" onClick={() => updateSlot.mutate({ id: slot.id, data: { is_locked: !slot.is_locked } }, { onSuccess: refresh, onError: () => setNotice("Le verrouillage n’a pas pu être modifié.") })} aria-label={slot.is_locked ? "Déverrouiller" : "Verrouiller"} className="rounded p-1 text-muted-foreground hover:bg-white hover:text-[#9b762d]">{slot.is_locked ? <Lock size={13} /> : <Unlock size={13} />}</button>}
                      </div>
                      {currentStaff && <div draggable={!slot?.is_locked} onDragStart={() => setDraggedStaff(currentStaff.id)} className="mt-3 flex cursor-grab items-center gap-2 text-[11px] text-muted-foreground"><span className="size-2 rounded-full bg-[#4a9ba3]" />{currentStaff.role === "radiologue" ? "Radiologue" : currentStaff.role === "medecin" ? "Médecin" : currentStaff.role}</div>}
                      {slot && <button type="button" onClick={() => assign(date, shift.type, "", slot)} disabled={slot.is_locked} className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[#ae4a44] disabled:opacity-40"><Trash2 size={11} /> Retirer</button>}
                      {!slot && shift.type !== "repos" && <span className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground"><Plus size={11} /> Cellule libre</span>}
                    </div>
                  </td>;
                })}
              </tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-border bg-[#fafcfc] px-5 py-3 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#4a9ba3]" /> Affecté</span><span className="flex items-center gap-1.5"><Lock size={12} className="text-[#b58a39]" /> Verrouillé</span><span className="ml-auto">Les modifications sont enregistrées dans `schedule_slots`.</span></div>
      </section>
    </div>
  );
}