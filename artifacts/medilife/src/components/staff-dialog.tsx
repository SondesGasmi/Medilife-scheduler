import { type FormEvent, useEffect, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import type {
  ContractType,
  Staff,
  StaffInput,
  StaffRole,
  StaffUpdate,
} from "@workspace/api-client-react";

type StaffFormValues = {
  full_name: string;
  email: string;
  phone: string;
  role: StaffRole;
  contract_type: ContractType;
  specialities: string;
  max_shifts_per_week: string;
  max_gardes_per_month: string;
  scheduling_constraints: string;
  hire_date: string;
  is_active: boolean;
};

const emptyValues: StaffFormValues = {
  full_name: "",
  email: "",
  phone: "",
  role: "medecin",
  contract_type: "cdi",
  specialities: "",
  max_shifts_per_week: "4",
  max_gardes_per_month: "",
  scheduling_constraints: "{}",
  hire_date: "",
  is_active: true,
};

const roleOptions: Array<{ value: StaffRole; label: string }> = [
  { value: "radiologue", label: "Radiologue" },
  { value: "medecin", label: "Médecin" },
  { value: "manipulateur_radio", label: "Manipulateur radio" },
  { value: "technicien", label: "Technicien" },
  { value: "secretaire", label: "Secrétaire" },
  { value: "administrateur", label: "Administrateur" },
];

const contractOptions: Array<{ value: ContractType; label: string }> = [
  { value: "cdi", label: "CDI" },
  { value: "temps_partiel", label: "Temps partiel" },
  { value: "vacataire", label: "Vacataire" },
  { value: "stagiaire", label: "Stagiaire" },
];

function staffToValues(staff: Staff): StaffFormValues {
  return {
    full_name: staff.full_name,
    email: staff.email,
    phone: staff.phone ?? "",
    role: staff.role,
    contract_type: staff.contract_type,
    specialities: staff.specialities.join(", "),
    max_shifts_per_week: String(staff.max_shifts_per_week),
    max_gardes_per_month: staff.max_gardes_per_month == null ? "" : String(staff.max_gardes_per_month),
    scheduling_constraints: JSON.stringify(staff.scheduling_constraints, null, 2),
    hire_date: staff.hire_date ?? "",
    is_active: staff.is_active,
  };
}

export function StaffDialog({
  open,
  staff,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  staff: Staff | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (data: StaffInput | StaffUpdate) => void;
}) {
  const [values, setValues] = useState<StaffFormValues>(emptyValues);
  const [error, setError] = useState("");
  const isEditing = Boolean(staff);

  useEffect(() => {
    if (open) {
      setValues(staff ? staffToValues(staff) : emptyValues);
      setError("");
    }
  }, [open, staff]);

  if (!open) return null;

  const update = <K extends keyof StaffFormValues>(key: K, value: StaffFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (values.full_name.trim().length < 2) {
      setError("Le nom doit comporter au moins 2 caractères.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      setError("Saisissez une adresse e-mail valide.");
      return;
    }

    const maxShifts = Number(values.max_shifts_per_week);
    if (!Number.isInteger(maxShifts) || maxShifts < 1 || maxShifts > 14) {
      setError("La capacité doit être comprise entre 1 et 14 gardes.");
      return;
    }

    const maxGardes = values.max_gardes_per_month.trim() === ""
      ? null
      : Number(values.max_gardes_per_month);
    if (maxGardes !== null && (!Number.isInteger(maxGardes) || maxGardes < 0)) {
      setError("Le nombre maximal de gardes mensuelles doit être un entier positif.");
      return;
    }

    let schedulingConstraints: Record<string, unknown>;
    try {
      const parsed = JSON.parse(values.scheduling_constraints || "{}") as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("object");
      }
      schedulingConstraints = parsed as Record<string, unknown>;
    } catch {
      setError("Les contraintes doivent être un objet JSON valide, par exemple {}.");
      return;
    }

    const specialities = values.specialities
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    setError("");
    onSubmit({
      full_name: values.full_name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || null,
      role: values.role,
      contract_type: values.contract_type,
      specialities,
      scheduling_constraints: schedulingConstraints,
      max_shifts_per_week: maxShifts,
      max_gardes_per_month: maxGardes,
      is_active: values.is_active,
      hire_date: values.hire_date || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(215_46%_15%/.44)] p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-dialog-title"
    >
      <div className="animate-enter max-h-[95dvh] w-full max-w-[760px] overflow-y-auto rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-border bg-[#f2f6f7] px-6 py-5">
          <div>
            <p className="font-mono-ui text-[10px] uppercase tracking-[.17em] text-[#39858c]">
              {isEditing ? "Modifier le dossier" : "Nouveau dossier"}
            </p>
            <h2 id="staff-dialog-title" className="mt-1 font-display text-[29px] leading-tight tracking-[-.025em] text-foreground">
              {isEditing ? "Mettre à jour le membre" : "Ajouter un membre"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Les informations sont enregistrées dans le référentiel Supabase.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" data-testid="button-close-staff-dialog" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-6 py-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="form-label">Nom complet <b>*</b></span>
              <input autoFocus value={values.full_name} onChange={(event) => update("full_name", event.target.value)} placeholder="Ex. Dr Claire Martin" data-testid="input-staff-full-name" className="form-input" />
            </label>
            <label>
              <span className="form-label">Adresse e-mail <b>*</b></span>
              <input type="email" value={values.email} onChange={(event) => update("email", event.target.value)} placeholder="claire.martin@medilife.fr" data-testid="input-staff-email" className="form-input" />
            </label>
            <label>
              <span className="form-label">Téléphone</span>
              <input type="tel" value={values.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+33 6 00 00 00 00" data-testid="input-staff-phone" className="form-input" />
            </label>
            <label>
              <span className="form-label">Rôle <b>*</b></span>
              <select value={values.role} onChange={(event) => update("role", event.target.value as StaffRole)} data-testid="select-staff-role" className="form-input">
                {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">Type de contrat <b>*</b></span>
              <select value={values.contract_type} onChange={(event) => update("contract_type", event.target.value as ContractType)} data-testid="select-staff-contract" className="form-input">
                {contractOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="form-label">Spécialités</span>
              <input value={values.specialities} onChange={(event) => update("specialities", event.target.value)} placeholder="Échographie, Echodoppler, séparées par des virgules" data-testid="input-staff-specialities" className="form-input" />
              <span className="mt-1 block text-[11px] text-muted-foreground">Chaque spécialité est enregistrée comme une valeur distincte.</span>
            </label>
            <label>
              <span className="form-label">Gardes max. / semaine <b>*</b></span>
              <input type="number" min="1" max="14" value={values.max_shifts_per_week} onChange={(event) => update("max_shifts_per_week", event.target.value)} data-testid="input-staff-max-shifts" className="form-input" />
            </label>
            <label>
              <span className="form-label">Gardes max. / mois</span>
              <input type="number" min="0" value={values.max_gardes_per_month} onChange={(event) => update("max_gardes_per_month", event.target.value)} placeholder="Sans limite" data-testid="input-staff-max-gardes" className="form-input" />
            </label>
            <label>
              <span className="form-label">Date d’embauche</span>
              <input type="date" value={values.hire_date} onChange={(event) => update("hire_date", event.target.value)} data-testid="input-staff-hire-date" className="form-input" />
            </label>
            <label className="flex items-center gap-3 self-end pb-2">
              <input type="checkbox" checked={values.is_active} onChange={(event) => update("is_active", event.target.checked)} data-testid="checkbox-staff-active" className="size-4 accent-[#39858c]" />
              <span className="text-xs font-medium text-foreground">Membre actif</span>
            </label>
            <label className="sm:col-span-2">
              <span className="form-label">Contraintes de planning (JSON)</span>
              <textarea value={values.scheduling_constraints} onChange={(event) => update("scheduling_constraints", event.target.value)} rows={4} placeholder={'{"no_night_shifts": true}'} data-testid="textarea-staff-constraints" className="form-input min-h-[96px] font-mono-ui text-[11px]" />
              <span className="mt-1 block text-[11px] text-muted-foreground">Les règles restent flexibles pour le moteur de planning.</span>
            </label>
          </div>

          {error && <p role="alert" data-testid="status-staff-form-error" className="rounded-lg border border-[#ecc7c5] bg-[#fdf1f0] px-3 py-2.5 text-xs font-medium text-[#a93d39]">{error}</p>}
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} data-testid="button-cancel-staff" className="button-secondary">Annuler</button>
            <button type="submit" disabled={pending} data-testid="button-submit-staff" className="button-primary min-w-[156px]">
              {pending ? <><LoaderCircle size={15} className="animate-spin" /> Enregistrement…</> : isEditing ? "Enregistrer les modifications" : "Créer la fiche"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}