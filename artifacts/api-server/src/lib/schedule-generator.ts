import type { StaffConstraints } from "@workspace/api-zod";

export type ShiftRecord = {
  staff_id: string | null;
  shift_date: string;
  shift_type: string;
  status?: string;
};

export type SchedulableStaff = {
  id: string;
  max_shifts_per_week: number;
  max_gardes_per_month: number | null;
  constraints: StaffConstraints;
};

export type GeneratedShift = {
  staff_id: string;
  shift_date: string;
  shift_type: string;
  status: "planifie";
  is_locked: false;
};

const generatedShiftTypes = ["journee_complete", "garde_jour", "garde_nuit"];

const shiftHours: Record<string, { start: number; duration: number }> = {
  matin: { start: 8, duration: 6 },
  apres_midi: { start: 14, duration: 6 },
  journee_complete: { start: 8, duration: 12 },
  garde_jour: { start: 8, duration: 12 },
  garde_nuit: { start: 20, duration: 12 },
  repos: { start: 0, duration: 0 },
};

function dateAtUtcHour(date: string, hour: number) {
  const dayStart = new Date(`${date}T00:00:00Z`).getTime() / 3_600_000;
  return dayStart + hour;
}

function interval(slot: ShiftRecord) {
  const rule = shiftHours[slot.shift_type] ?? shiftHours.journee_complete;
  const start = dateAtUtcHour(slot.shift_date, rule.start);
  return { start, end: start + rule.duration };
}

function duration(slot: ShiftRecord) {
  return (shiftHours[slot.shift_type] ?? shiftHours.journee_complete).duration;
}

function isCountable(slot: ShiftRecord): slot is ShiftRecord & { staff_id: string } {
  return slot.staff_id !== null && slot.status !== "annule" && slot.shift_type !== "repos";
}

function mondayOf(date: string) {
  const current = new Date(`${date}T00:00:00Z`);
  const daysFromMonday = (current.getUTCDay() + 6) % 7;
  current.setUTCDate(current.getUTCDate() - daysFromMonday);
  return current.toISOString().slice(0, 10);
}

function isNightShift(slot: ShiftRecord, staffId: string, date: string) {
  return slot.staff_id === staffId && slot.shift_date === date && slot.shift_type === "garde_nuit" && slot.status !== "annule";
}

function nightLimitAllows(staff: SchedulableStaff, date: string, shifts: ShiftRecord[]) {
  const max = staff.constraints.max_consecutive_nights;
  if (max === 0) return false;
  let consecutive = 0;
  const previous = new Date(`${date}T00:00:00Z`);
  for (let day = 1; day <= max; day += 1) {
    previous.setUTCDate(previous.getUTCDate() - 1);
    const previousDate = previous.toISOString().slice(0, 10);
    if (!shifts.some((slot) => isNightShift(slot, staff.id, previousDate))) break;
    consecutive += 1;
  }
  return consecutive < max;
}

function restAllows(staff: SchedulableStaff, candidate: ShiftRecord, shifts: ShiftRecord[]) {
  const nextInterval = interval(candidate);
  const requiredRest = staff.constraints.min_rest_hours;
  return shifts.every((slot) => {
    if (slot.staff_id !== staff.id || !isCountable(slot)) return true;
    const currentInterval = interval(slot);
    if (nextInterval.start < currentInterval.end && currentInterval.start < nextInterval.end) {
      return false;
    }
    const gap = nextInterval.start >= currentInterval.end
      ? nextInterval.start - currentInterval.end
      : currentInterval.start >= nextInterval.end
        ? currentInterval.start - nextInterval.end
        : 0;
    return gap >= requiredRest;
  });
}

function weeklyLimitsAllow(staff: SchedulableStaff, candidate: ShiftRecord, shifts: ShiftRecord[]) {
  const candidateWeek = mondayOf(candidate.shift_date);
  const thisWeek = shifts.filter((slot) =>
    slot.staff_id === staff.id &&
    slot.status !== "annule" &&
    slot.shift_type !== "repos" &&
    mondayOf(slot.shift_date) === candidateWeek,
  );
  const hours = thisWeek.reduce((sum, slot) => sum + duration(slot), 0) + duration(candidate);
  const maxHours = staff.constraints.max_hours_per_week;
  const maxShifts = staff.max_shifts_per_week;
  return hours <= maxHours && thisWeek.length < maxShifts;
}

function monthlyGuardLimitAllows(staff: SchedulableStaff, candidate: ShiftRecord, shifts: ShiftRecord[]) {
  if (staff.max_gardes_per_month === null || !["garde_jour", "garde_nuit"].includes(candidate.shift_type)) return true;
  const month = candidate.shift_date.slice(0, 7);
  const count = shifts.filter((slot) =>
    slot.staff_id === staff.id &&
    slot.shift_date.startsWith(month) &&
    slot.status !== "annule" &&
    ["garde_jour", "garde_nuit"].includes(slot.shift_type),
  ).length;
  return count < staff.max_gardes_per_month;
}

function canAssign(staff: SchedulableStaff, date: string, shiftType: string, shifts: ShiftRecord[]) {
  if (shiftType === "garde_nuit" && !staff.constraints.can_work_night) return false;
  if (shiftType === "garde_nuit" && !nightLimitAllows(staff, date, shifts)) return false;
  const candidate: ShiftRecord = { staff_id: staff.id, shift_date: date, shift_type: shiftType };
  return weeklyLimitsAllow(staff, candidate, shifts) &&
    monthlyGuardLimitAllows(staff, candidate, shifts) &&
    restAllows(staff, candidate, shifts);
}

export function generateScheduleAssignments(
  dates: string[],
  staff: SchedulableStaff[],
  seedSlots: ShiftRecord[],
): GeneratedShift[] {
  const assignments: ShiftRecord[] = [...seedSlots.filter(isCountable)];
  const generated: GeneratedShift[] = [];
  const generatedCountByStaff = new Map<string, number>();

  for (const date of dates) {
    const assignedToday = new Set(assignments.filter((slot) => slot.shift_date === date).map((slot) => slot.staff_id));
    for (const shiftType of generatedShiftTypes) {
      const selected = staff
        .filter((member) => !assignedToday.has(member.id) && canAssign(member, date, shiftType, assignments))
        .sort((left, right) =>
          (generatedCountByStaff.get(left.id) ?? 0) - (generatedCountByStaff.get(right.id) ?? 0) ||
          left.id.localeCompare(right.id),
        )[0];
      if (!selected) continue;

      const item: GeneratedShift = {
        staff_id: selected.id,
        shift_date: date,
        shift_type: shiftType,
        status: "planifie",
        is_locked: false,
      };
      generated.push(item);
      assignments.push(item);
      assignedToday.add(selected.id);
      generatedCountByStaff.set(selected.id, (generatedCountByStaff.get(selected.id) ?? 0) + 1);
    }
  }

  return generated;
}

export function addUtcDays(date: string, count: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + count);
  return result.toISOString().slice(0, 10);
}

export function listDates(from: string, to: string) {
  const result: string[] = [];
  for (let current = from; current <= to; current = addUtcDays(current, 1)) result.push(current);
  return result;
}