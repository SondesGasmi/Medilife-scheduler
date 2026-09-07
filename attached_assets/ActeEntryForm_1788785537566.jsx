import React, { useMemo, useState } from "react";
import { Stethoscope, CircleCheck, Minus, Plus } from "lucide-react";
import { ACTS, formatDA } from "./constants";

const MOCK_STAFF = [
  { id: "s1", name: "Dr. Amrani" },
  { id: "s2", name: "Dr. Belkacem" },
  { id: "s3", name: "Dr. Cherif" },
  { id: "s4", name: "N. Haddad" },
];

export default function ActeEntryForm({ onSubmit = () => {} }) {
  const [staffId, setStaffId] = useState("");
  const [actId, setActId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recent, setRecent] = useState([]);

  const selectedAct = useMemo(() => ACTS.find((a) => a.id === actId), [actId]);
  const total = selectedAct ? selectedAct.basePrice * quantity : 0;
  const canSubmit = staffId && actId && quantity > 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    const staff = MOCK_STAFF.find((s) => s.id === staffId);
    const entry = {
      id: crypto.randomUUID(),
      staffName: staff.name,
      actName: selectedAct.name,
      quantity,
      unitPrice: selectedAct.basePrice,
      total,
      date,
    };

    setRecent((prev) => [entry, ...prev].slice(0, 5));
    onSubmit(entry);

    setActId("");
    setQuantity(1);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
      >
        <div className="flex items-center gap-2.5 pb-1">
          <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
            <Stethoscope className="w-[18px] h-[18px] text-teal-600" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="text-[15px] font-medium text-slate-900 leading-tight">
              Nouvel acte
            </h2>
            <p className="text-[12px] text-slate-500 leading-tight">
              Enregistrer un acte réalisé pendant une garde
            </p>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
            Membre du personnel
          </label>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-[13px] text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
          >
            <option value="">Sélectionner...</option>
            {MOCK_STAFF.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
            Acte diagnostique
          </label>
          <select
            value={actId}
            onChange={(e) => setActId(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-[13px] text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
          >
            <option value="">Sélectionner un acte...</option>
            {ACTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Quantité
            </label>
            <div className="flex items-center border border-slate-300 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-2.5 py-2 text-slate-500 hover:bg-slate-50"
              >
                <Minus className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full text-center text-[13px] tabular-nums py-2 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="px-2.5 py-2 text-slate-500 hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-[13px] text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium py-2.5 rounded-md transition-colors"
        >
          <CircleCheck className="w-4 h-4" strokeWidth={2} />
          Enregistrer l'acte
        </button>
      </form>

      <div className="space-y-4">
        <div className="bg-slate-900 rounded-lg p-5">
          <p className="text-[12px] text-slate-400 mb-1">Total à payer</p>
          <p className="text-[28px] font-medium text-white tabular-nums leading-none">
            {formatDA(total)}
          </p>
          {selectedAct && (
            <div className="mt-3 pt-3 border-t border-slate-700 text-[12px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Prix unitaire</span>
                <span className="tabular-nums text-slate-300">
                  {formatDA(selectedAct.basePrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Quantité</span>
                <span className="tabular-nums text-slate-300">{quantity}</span>
              </div>
            </div>
          )}
        </div>

        {recent.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[12px] font-medium text-slate-500 mb-2">
              Dernières saisies
            </p>
            <ul className="space-y-2">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-[12px]">
                  <div className="min-w-0 pr-2">
                    <p className="text-slate-700 truncate">{r.staffName}</p>
                    <p className="text-slate-400 truncate">{r.actName}</p>
                  </div>
                  <span className="tabular-nums text-slate-700 shrink-0">
                    {formatDA(r.total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
