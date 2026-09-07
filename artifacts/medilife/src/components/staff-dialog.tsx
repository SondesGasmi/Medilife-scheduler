import { type FormEvent, useEffect, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import type { Staff, StaffInput, StaffUpdate } from "@workspace/api-client-react";

type StaffFormValues = {
  full_name: string;
  email: string;
  phone: string;
  speciality: string;
  max_shifts_per_week: string;
};

const emptyValues: StaffFormValues = { full_name: "", email: "", phone: "", speciality: "", max_shifts_per_week: "4" };

export function StaffDialog({ open, staff, pending, onClose, onSubmit }: { open: boolean; staff: Staff | null; pending: boolean; onClose: () => void; onSubmit: (data: StaffInput | StaffUpdate) => void }) {
  const [values, setValues] = useState<StaffFormValues>(emptyValues);
  const [error, setError] = useState("");
  const isEditing = Boolean(staff);

  useEffect(() => {
    if (open) {
      setValues(staff ? { full_name: staff.full_name, email: staff.email, phone: staff.phone ?? "", speciality: staff.speciality ?? "", max_shifts_per_week: String(staff.max_shifts_per_week) } : emptyValues);
      setError("");
    }
  }, [open, staff]);

  if (!open) return null;

  const update = (key: keyof StaffFormValues, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (values.full_name.trim().length < 2) return setError("Le nom doit comporter au moins 2 caractères.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return setError("Saisissez une adresse e-mail valide.");
    const shifts = Number(values.max_shifts_per_week);
    if (!Number.isInteger(shifts) || shifts < 1 || shifts > 14) return setError("La capacité doit être comprise entre 1 et 14 gardes.");
    setError("");
    onSubmit({ full_name: values.full_name.trim(), email: values.email.trim(), phone: values.phone.trim() || null, speciality: values.speciality.trim() || null, max_shifts_per_week: shifts });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(215_46%_15%/.44)] p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="staff-dialog-title">
      <div className="animate-enter w-full max-w-[620px] overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-border bg-[#f2f6f7] px-6 py-5">
          <div>
            <p className="font-mono-ui text-[10px] uppercase tracking-[.17em] text-[#39858c]">{isEditing ? "Modifier le dossier" : "Nouveau dossier"}</p>
            <h2 id="staff-dialog-title" className="mt-1 font-display text-[29px] leading-tight tracking-[-.025em] text-foreground">{isEditing ? "Mettre à jour le membre" : "Ajouter un membre"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{isEditing ? "Les informations seront visibles par l’équipe d’administration." : "Créez une fiche pour organiser les futures gardes."}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" data-testid="button-close-staff-dialog" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-5 px-6 py-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="form-label">Nom complet <b>*</b></span><input autoFocus value={values.full_name} onChange={(event) => update("full_name", event.target.value)} placeholder="Ex. Dr Claire Martin" data-testid="input-staff-full-name" className="form-input" /></label>
            <label><span className="form-label">Adresse e-mail <b>*</b></span><input type="email" value={values.email} onChange={(event) => update("email", event.target.value)} placeholder="claire.martin@medilife.fr" data-testid="input-staff-email" className="form-input" /></label>
            <label><span className="form-label">Téléphone</span><input type="tel" value={values.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+33 6 00 00 00 00" data-testid="input-staff-phone" className="form-input" /></label>
            <label><span className="form-label">Spécialité</span><input value={values.speciality} onChange={(event) => update("speciality", event.target.value)} placeholder="Radiologie, cardiologie…" data-testid="input-staff-speciality" className="form-input" /></label>
            <label><span className="form-label">Gardes max. / semaine <b>*</b></span><input type="number" min="1" max="14" value={values.max_shifts_per_week} onChange={(event) => update("max_shifts_per_week", event.target.value)} data-testid="input-staff-max-shifts" className="form-input" /></label>
          </div>
          {error && <p role="alert" data-testid="status-staff-form-error" className="rounded-lg border border-[#ecc7c5] bg-[#fdf1f0] px-3 py-2.5 text-xs font-medium text-[#a93d39]">{error}</p>}
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} data-testid="button-cancel-staff" className="button-secondary">Annuler</button>
            <button type="submit" disabled={pending} data-testid="button-submit-staff" className="button-primary min-w-[156px]">{pending ? <><LoaderCircle size={15} className="animate-spin" /> Enregistrement…</> : isEditing ? "Enregistrer les modifications" : "Créer la fiche"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}