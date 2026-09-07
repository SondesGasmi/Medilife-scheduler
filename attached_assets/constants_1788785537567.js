// Shared reference data — mirrors the `acts` table seed data and the
// shift_type enum from the Phase 1 schema. In production these come from
// Supabase; kept as static constants here so components stay self-contained.

export const SHIFT_ROWS = [
  {
    id: "matin",
    label: "Matin",
    time: "08h – 14h",
    accent: "border-teal-500",
    chip: "bg-teal-50 text-teal-700",
  },
  {
    id: "apres_midi",
    label: "Après-midi",
    time: "14h – 20h",
    accent: "border-sky-500",
    chip: "bg-sky-50 text-sky-700",
  },
  {
    id: "nuit",
    label: "Nuit",
    time: "20h – 08h",
    accent: "border-slate-500",
    chip: "bg-slate-100 text-slate-700",
  },
  {
    id: "garde",
    label: "Garde",
    time: "24h",
    accent: "border-indigo-500",
    chip: "bg-indigo-50 text-indigo-700",
  },
];

// Matches the 12 seed rows in the `acts` table (Phase 1 schema)
export const ACTS = [
  { id: "ECHO_ABDO_PELV", name: "Échographie générale abdomino-pelvienne", basePrice: 1500 },
  { id: "DOPPLER_RENAL", name: "Echodoppler rénal", basePrice: 2200 },
  { id: "DOPPLER_HEPATIQUE", name: "Echodoppler hépatique", basePrice: 2200 },
  { id: "DOPPLER_FAV", name: "Echodoppler des fistules (FAV)", basePrice: 2500 },
  { id: "DOPPLER_VASC_TSA_MI", name: "Echodoppler vasculaire artériel et veineux (TSA, membres)", basePrice: 2800 },
  { id: "ECHO_OSTEOARTIC", name: "Échographie ostéoarticulaire", basePrice: 1800 },
  { id: "ECHO_PARTIES_MOLLES", name: "Échographie des parties molles", basePrice: 1600 },
  { id: "ECHO_MAMMAIRE", name: "Échographie mammaire", basePrice: 1700 },
  { id: "ECHO_CERVICALE", name: "Échographie cervicale", basePrice: 1600 },
  { id: "ECHO_TRANSFRONT", name: "Échographie transfrontalière", basePrice: 1900 },
  { id: "ECHO_PEDIATRIQUE", name: "Échographie pédiatrique (hanches, etc.)", basePrice: 1800 },
  { id: "TRANSTHORACIQUE", name: "Transthoracique de repérage", basePrice: 1200 },
];

export function formatDA(amount) {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} DA`;
}
