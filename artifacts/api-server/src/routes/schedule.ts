import { ReplitConnectors } from "@replit/connectors-sdk";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateScheduleSlotBody,
  DeleteScheduleSlotParams,
  GenerateScheduleBody,
  UpdateScheduleSlotBody,
  UpdateScheduleSlotParams,
} from "@workspace/api-zod";

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

type StaffConstraintRow = {
  id: string;
  scheduling_constraints: Record<string, unknown> | null;
  max_shifts_per_week: number;
};

const router: IRouter = Router();

async function requestSupabase(path: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  return new ReplitConnectors().proxy("supabase", `/rest/v1${path}`, init);
}

async function errorMessage(response: globalThis.Response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { message?: string; details?: string };
    return parsed.message ?? parsed.details ?? text;
  } catch {
    return text || `Supabase returned HTTP ${response.status}`;
  }
}

function sendError(res: Response, message: string, status = 502) {
  const missingSchema = message.includes("Could not find") || message.includes("schema cache");
  res.status(missingSchema ? 503 : status).json({
    error: missingSchema ? "Le schéma MediLife n'est pas encore installé dans Supabase." : message,
  });
}

function toSchedule(row: ScheduleRow) {
  return row;
}

function dateRange(from: string, to: string) {
  const result: string[] = [];
  const current = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (current <= end) {
    result.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return result;
}

function dateValue(value: string | Date) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function queryDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : value;
}

function isUnavailable(staff: StaffConstraintRow, date: string, shiftType: string) {
  const constraints = staff.scheduling_constraints ?? {};
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const unavailable = constraints.unavailable_weekdays;
  if (Array.isArray(unavailable) && unavailable.some((value) => Number(value) === weekday || String(value) === String(weekday))) {
    return true;
  }
  if (shiftType === "garde_nuit" && constraints.no_night_shifts === true) return true;
  const fixedDaysOff = constraints.fixed_days_off;
  if (Array.isArray(fixedDaysOff) && fixedDaysOff.includes(date)) return true;
  return false;
}

router.get("/schedule-slots", async (req: Request, res: Response) => {
  const from = queryDate(req.query.from);
  const to = queryDate(req.query.to);
  if (!from || !to || from > to) {
    res.status(400).json({ error: "La période du planning est invalide." });
    return;
  }

  try {
    const response = await requestSupabase(
      `/schedule_slots?select=id,staff_id,shift_date,shift_type,status,is_locked,locked_by,locked_at,notes,created_at,updated_at&shift_date=gte.${encodeURIComponent(from)}&shift_date=lte.${encodeURIComponent(to)}&order=shift_date.asc,shift_type.asc`,
    );
    if (!response.ok) {
      sendError(res, await errorMessage(response));
      return;
    }
    res.json(((await response.json()) as ScheduleRow[]).map(toSchedule));
  } catch (error) {
    req.log.error({ err: error }, "Unable to list schedule slots");
    sendError(res, "Impossible de charger le planning.");
  }
});

router.post("/schedule-slots", async (req: Request, res: Response) => {
  const parsed = CreateScheduleSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Les informations du créneau sont invalides." });
    return;
  }

  try {
    const response = await requestSupabase("/schedule_slots", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        ...parsed.data,
        status: parsed.data.status ?? "planifie",
        is_locked: parsed.data.is_locked ?? false,
        notes: parsed.data.notes ?? null,
      }),
    });
    if (!response.ok) {
      sendError(res, await errorMessage(response), response.status === 409 ? 409 : 502);
      return;
    }
    const row = ((await response.json()) as ScheduleRow[])[0];
    if (!row) {
      sendError(res, "Supabase n'a pas renvoyé le créneau créé.");
      return;
    }
    res.status(201).json(toSchedule(row));
  } catch (error) {
    req.log.error({ err: error }, "Unable to create schedule slot");
    sendError(res, "Impossible de créer le créneau.");
  }
});

router.post("/schedule-slots/generate", async (req: Request, res: Response) => {
  const parsed = GenerateScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "La période de génération est invalide." });
    return;
  }

  const from = dateValue(parsed.data.from);
  const to = dateValue(parsed.data.to);
  const { full_reset = false } = parsed.data;
  try {
    const existingResponse = await requestSupabase(
      `/schedule_slots?select=id,staff_id,shift_date,shift_type,is_locked&shift_date=gte.${encodeURIComponent(from)}&shift_date=lte.${encodeURIComponent(to)}`,
    );
    if (!existingResponse.ok) {
      sendError(res, await errorMessage(existingResponse));
      return;
    }
    const existing = (await existingResponse.json()) as Array<Pick<ScheduleRow, "id" | "staff_id" | "shift_date" | "shift_type" | "is_locked">>;

    const deleteFilter = full_reset ? "" : "&is_locked=eq.false";
    const deleteResponse = await requestSupabase(
      `/schedule_slots?shift_date=gte.${encodeURIComponent(from)}&shift_date=lte.${encodeURIComponent(to)}${deleteFilter}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
    );
    if (!deleteResponse.ok) {
      sendError(res, await errorMessage(deleteResponse));
      return;
    }

    const staffResponse = await requestSupabase(
      "/staff?select=id,scheduling_constraints,max_shifts_per_week&is_active=eq.true&order=full_name.asc",
    );
    if (!staffResponse.ok) {
      sendError(res, await errorMessage(staffResponse));
      return;
    }
    const staff = (await staffResponse.json()) as StaffConstraintRow[];
    const locked = full_reset ? [] : existing.filter((slot) => slot.is_locked);
    const created: Array<Record<string, unknown>> = [];
    const shiftTypes = ["journee_complete", "garde_jour", "garde_nuit"];
    const assignedPerStaff = new Map<string, number>();

    for (const date of dateRange(from, to)) {
      const assignedToday = new Set<string>(
        locked.filter((slot) => slot.shift_date === date && slot.staff_id).map((slot) => slot.staff_id as string),
      );
      for (const shiftType of shiftTypes) {
        const candidates = staff
          .filter((member) => !assignedToday.has(member.id) && !isUnavailable(member, date, shiftType))
          .sort((a, b) => (assignedPerStaff.get(a.id) ?? 0) - (assignedPerStaff.get(b.id) ?? 0));
        const selected = candidates[0];
        if (!selected) continue;
        assignedToday.add(selected.id);
        assignedPerStaff.set(selected.id, (assignedPerStaff.get(selected.id) ?? 0) + 1);
        created.push({
          staff_id: selected.id,
          shift_date: date,
          shift_type: shiftType,
          status: "planifie",
          is_locked: false,
        });
      }
    }

    if (created.length === 0) {
      res.json([]);
      return;
    }

    const insertResponse = await requestSupabase("/schedule_slots", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(created),
    });
    if (!insertResponse.ok) {
      sendError(res, await errorMessage(insertResponse), insertResponse.status === 409 ? 409 : 502);
      return;
    }
    res.json((await insertResponse.json() as ScheduleRow[]).map(toSchedule));
  } catch (error) {
    req.log.error({ err: error }, "Unable to generate schedule");
    sendError(res, "Impossible de générer le planning.");
  }
});

router.patch("/schedule-slots/:id", async (req: Request, res: Response) => {
  const params = UpdateScheduleSlotParams.safeParse(req.params);
  const parsed = UpdateScheduleSlotBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Les informations du créneau sont invalides." });
    return;
  }

  try {
    const response = await requestSupabase(`/schedule_slots?id=eq.${encodeURIComponent(params.data.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(parsed.data),
    });
    if (!response.ok) {
      sendError(res, await errorMessage(response), response.status === 409 ? 409 : 502);
      return;
    }
    const row = ((await response.json()) as ScheduleRow[])[0];
    if (!row) {
      res.status(404).json({ error: "Créneau introuvable." });
      return;
    }
    res.json(toSchedule(row));
  } catch (error) {
    req.log.error({ err: error }, "Unable to update schedule slot");
    sendError(res, "Impossible de modifier le créneau.");
  }
});

router.delete("/schedule-slots/:id", async (req: Request, res: Response) => {
  const params = DeleteScheduleSlotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Identifiant de créneau invalide." });
    return;
  }

  try {
    const response = await requestSupabase(`/schedule_slots?id=eq.${encodeURIComponent(params.data.id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    });
    if (!response.ok) {
      sendError(res, await errorMessage(response));
      return;
    }
    if (((await response.json()) as ScheduleRow[]).length === 0) {
      res.status(404).json({ error: "Créneau introuvable." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Unable to delete schedule slot");
    sendError(res, "Impossible de supprimer le créneau.");
  }
});

export default router;