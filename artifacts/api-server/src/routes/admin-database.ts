import { ReplitConnectors } from "@replit/connectors-sdk";
import { GetAdminDatabaseSnapshotResponse } from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";
import type { StaffConstraints } from "@workspace/api-zod";
import { defaultStaffConstraints, normalizeStaffConstraints } from "../lib/user-constraints";

type StaffRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  contract_type: string;
  specialities: string[] | null;
  max_shifts_per_week: number;
  max_gardes_per_month: number | null;
  is_active: boolean;
  hire_date: string | null;
  created_at: string;
  updated_at: string;
};

type ConstraintRow = StaffConstraints & { staff_id: string };

type ScheduleRow = {
  id: string;
  staff_id: string | null;
  shift_date: string;
  shift_type: string;
  status: string;
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const router: IRouter = Router();
const pageSize = 1000;

async function readPage(path: string, offset: number) {
  return new ReplitConnectors().proxy("supabase", `/rest/v1${path}`, {
    headers: {
      "Range-Unit": "items",
      Range: `${offset}-${offset + pageSize - 1}`,
    },
  });
}

async function readAll<T>(path: string): Promise<{ rows?: T[]; error?: string }> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const response = await readPage(path, offset);
    if (!response.ok) {
      const message = await response.text();
      try {
        const parsed = JSON.parse(message) as { message?: string; details?: string };
        return { error: parsed.message ?? parsed.details ?? message };
      } catch {
        return { error: message || `Supabase returned HTTP ${response.status}` };
      }
    }
    const page = (await response.json()) as T[];
    rows.push(...page);
    if (page.length < pageSize) return { rows };
  }
}

function sendError(res: Response, message: string) {
  const missingSchema = message.includes("Could not find") || message.includes("schema cache");
  res.status(missingSchema ? 503 : 502).json({
    error: missingSchema ? "Le schéma MediLife n'est pas encore installé dans Supabase." : message,
  });
}

router.get("/admin/database", async (req: Request, res: Response): Promise<void> => {
  try {
    const [staffResult, constraintResult, scheduleResult] = await Promise.all([
      readAll<StaffRow>("/staff?select=id,full_name,email,phone,role,contract_type,specialities,max_shifts_per_week,max_gardes_per_month,is_active,hire_date,created_at,updated_at&order=full_name.asc"),
      readAll<ConstraintRow>("/user_constraints?select=staff_id,max_hours_per_week,min_rest_hours,max_consecutive_nights,can_work_night"),
      readAll<ScheduleRow>("/schedule_slots?select=id,staff_id,shift_date,shift_type,status,is_locked,locked_by,locked_at,notes,created_at,updated_at&order=shift_date.desc"),
    ]);

    const failure = staffResult.error ?? constraintResult.error ?? scheduleResult.error;
    if (failure) {
      sendError(res, failure);
      return;
    }

    const staff = staffResult.rows ?? [];
    const constraints = constraintResult.rows ?? [];
    const schedules = scheduleResult.rows ?? [];
    const constraintsByStaffId = new Map(constraints.map(({ staff_id, ...values }) => [staff_id, values]));
    const users = staff.map((row) => ({
      ...row,
      specialities: row.specialities ?? [],
      constraints: normalizeStaffConstraints(constraintsByStaffId.get(row.id) ?? defaultStaffConstraints),
    }));
    const namesByStaffId = new Map(users.map((row) => [row.id, row.full_name]));
    const assignments = schedules
      .filter((slot): slot is ScheduleRow & { staff_id: string } => slot.staff_id !== null)
      .map((slot) => ({
        id: slot.id,
        staff_id: slot.staff_id,
        staff_name: namesByStaffId.get(slot.staff_id) ?? "Membre introuvable",
        shift_date: slot.shift_date,
        shift_type: slot.shift_type,
        status: slot.status,
        is_locked: slot.is_locked,
      }));

    const parsed = GetAdminDatabaseSnapshotResponse.safeParse({
      users,
      assignments,
      schedules,
    });
    if (!parsed.success) {
      req.log.error({ err: parsed.error }, "Admin database snapshot did not match API contract");
      res.status(502).json({ error: "La réponse Supabase ne correspond pas au contrat attendu." });
      return;
    }
    res.json(parsed.data);
  } catch (error) {
    req.log.error({ err: error }, "Unable to read admin database snapshot");
    res.status(502).json({ error: "Impossible de charger les données de la base." });
  }
});

export default router;