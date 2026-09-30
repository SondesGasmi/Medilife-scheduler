import assert from "node:assert/strict";
import test from "node:test";
import { generateScheduleAssignments } from "./schedule-generator.ts";

const standardStaff = {
  id: "staff-1",
  max_shifts_per_week: 14,
  max_gardes_per_month: null,
  constraints: {
    max_hours_per_week: 40,
    min_rest_hours: 11,
    max_consecutive_nights: 2,
    can_work_night: true,
  },
};

test("does not assign a night shift to staff who cannot work nights", () => {
  const staff = [{
    ...standardStaff,
    constraints: { ...standardStaff.constraints, can_work_night: false },
  }];

  const generated = generateScheduleAssignments(["2026-10-01"], staff, []);

  assert.ok(generated.length > 0);
  assert.ok(generated.every((slot) => slot.shift_type !== "garde_nuit"));
});

test("keeps generated weekly hours within the staff limit", () => {
  const staff = [{
    ...standardStaff,
    constraints: { ...standardStaff.constraints, max_hours_per_week: 20 },
  }];
  const existing = [{
    staff_id: standardStaff.id,
    shift_date: "2026-09-28",
    shift_type: "journee_complete",
    status: "planifie",
  }];

  const generated = generateScheduleAssignments(["2026-09-29"], staff, existing);

  assert.deepEqual(generated, []);
});

test("enforces the minimum rest period before assigning another shift", () => {
  const staff = [{
    ...standardStaff,
    constraints: { ...standardStaff.constraints, min_rest_hours: 13 },
  }];
  const existing = [{
    staff_id: standardStaff.id,
    shift_date: "2026-10-01",
    shift_type: "garde_nuit",
    status: "planifie",
  }];

  const generated = generateScheduleAssignments(["2026-10-02"], staff, existing);

  assert.deepEqual(generated, []);
});

test("stops assigning nights after the consecutive-night limit", () => {
  const existing = ["2026-10-01", "2026-10-02"].map((shift_date) => ({
    staff_id: standardStaff.id,
    shift_date,
    shift_type: "garde_nuit",
    status: "planifie",
  }));

  const generated = generateScheduleAssignments(["2026-10-03"], [standardStaff], existing);

  assert.deepEqual(generated, []);
});