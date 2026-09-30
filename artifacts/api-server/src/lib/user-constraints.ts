import type { StaffConstraints } from "@workspace/api-zod";

export type UserConstraintRow = StaffConstraints & { staff_id: string };

export const defaultStaffConstraints: StaffConstraints = {
  max_hours_per_week: 40,
  min_rest_hours: 11,
  max_consecutive_nights: 2,
  can_work_night: true,
};

export function normalizeStaffConstraints(
  value?: Partial<StaffConstraints> | null,
): StaffConstraints {
  return {
    max_hours_per_week: value?.max_hours_per_week ?? defaultStaffConstraints.max_hours_per_week,
    min_rest_hours: value?.min_rest_hours ?? defaultStaffConstraints.min_rest_hours,
    max_consecutive_nights: value?.max_consecutive_nights ?? defaultStaffConstraints.max_consecutive_nights,
    can_work_night: value?.can_work_night ?? defaultStaffConstraints.can_work_night,
  };
}

export function toUserConstraintPayload(staffId: string, value?: Partial<StaffConstraints> | null): UserConstraintRow {
  return {
    staff_id: staffId,
    ...normalizeStaffConstraints(value),
  };
}