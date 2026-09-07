import React, { useMemo, useState } from "react";
import { Lock, Unlock, Plus, X } from "lucide-react";
import { SHIFT_ROWS } from "./constants";

// Builds the 7 columns for the current week starting on `startDate`.
function useWeekDays(startDate) {
  return useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [startDate]);
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function slotKey(date, shiftId) {
  return `${dayKey(date)}__${shiftId}`;
}

// Mock staff roster — in production this comes from the `staff` table.
const MOCK_STAFF = [
  "Dr. Amrani",
  "Dr. Belkacem",
  "Dr. Cherif",
  "N. Haddad",
  "S. Meziane",
];

function AssignPopover({ staffOptions, onAssign, onClose }) {
  return (
    <div className="absolute z-20 top-full left-0 mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-md py-1">
      {staffOptions.map((name) => (
        <button
          key={name}
          onClick={() => {
            onAssign(name);
            onClose();
          }}
          className="w-full text-left px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50"
        >
          {name}
        </button>
      ))}
    </div>
  );
}

function Cell({ shift, assignment, onAssign, onRemove, onToggleLock }) {
  const [open, setOpen] = useState(false);
  const isLocked = assignment?.locked;

  if (!assignment) {
    return (
      <div className="relative h-full">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full h-full min-h-[64px] flex items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-300 hover:border-slate-400 hover:text-slate-400 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
        </button>
        {open && (
          <AssignPopover
            staffOptions={MOCK_STAFF}
            onAssign={onAssign}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative h-full min-h-[64px] rounded-md border-l-2 bg-white border border-slate-200 ${shift.accent} px-2.5 py-2 group`}
    >
      {isLocked && (
        <div className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
          <Lock className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
        </div>
      )}

      <p className="text-[13px] font-medium text-slate-800 leading-tight truncate pr-2">
        {assignment.name}
      </p>
      <p className="text-[11px] text-slate-400 leading-tight">{shift.time}</p>

      <div className="absolute inset-x-1.5 bottom-1.5 hidden group-hover:flex items-center justify-end gap-1">
        <button
          onClick={onToggleLock}
          className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-700"
          title={isLocked ? "Déverrouiller la cellule" : "Verrouiller la cellule"}
        >
          {isLocked ? (
            <Unlock className="w-3 h-3" strokeWidth={2} />
          ) : (
            <Lock className="w-3 h-3" strokeWidth={2} />
          )}
        </button>
        <button
          onClick={onRemove}
          className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-red-600"
          title="Retirer"
        >
          <X className="w-3 h-3" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

export default function ShiftMatrix({ weekStart = new Date(), initialAssignments = {} }) {
  const days = useWeekDays(weekStart);
  const [assignments, setAssignments] = useState(initialAssignments);

  function assign(date, shiftId, name) {
    setAssignments((prev) => ({
      ...prev,
      [slotKey(date, shiftId)]: { name, locked: false },
    }));
  }

  function remove(date, shiftId) {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[slotKey(date, shiftId)];
      return next;
    });
  }

  function toggleLock(date, shiftId) {
    setAssignments((prev) => {
      const key = slotKey(date, shiftId);
      if (!prev[key]) return prev;
      return { ...prev, [key]: { ...prev[key], locked: !prev[key].locked } };
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full border-collapse min-w-[880px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 w-32 p-3 text-left text-[12px] font-medium text-slate-500">
                Créneau
              </th>
              {days.map((d) => (
                <th
                  key={dayKey(d)}
                  className="bg-slate-50 border-b border-slate-200 p-3 text-center text-[12px] font-medium text-slate-500 min-w-[110px]"
                >
                  <span className="block text-slate-700 text-[13px] font-medium tabular-nums">
                    {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                  </span>
                  <span className="block capitalize">
                    {d.toLocaleDateString("fr-FR", { weekday: "short" })}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHIFT_ROWS.map((shift) => (
              <tr key={shift.id}>
                <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 p-3 align-top">
                  <span
                    className={`inline-block text-[12px] font-medium px-2 py-1 rounded ${shift.chip}`}
                  >
                    {shift.label}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">{shift.time}</p>
                </td>
                {days.map((d) => {
                  const key = slotKey(d, shift.id);
                  return (
                    <td key={key} className="border-b border-slate-100 p-1.5 align-top">
                      <Cell
                        shift={shift}
                        assignment={assignments[key]}
                        onAssign={(name) => assign(d, shift.id, name)}
                        onRemove={() => remove(d, shift.id)}
                        onToggleLock={() => toggleLock(d, shift.id)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 px-4 py-3 border-t border-slate-200 bg-slate-50">
        {SHIFT_ROWS.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm border-2 ${s.accent}`} />
            <span className="text-[12px] text-slate-500">{s.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <Lock className="w-3 h-3 text-amber-500" strokeWidth={2.5} />
          <span className="text-[12px] text-slate-500">Verrouillé manuellement</span>
        </div>
      </div>
    </div>
  );
}
