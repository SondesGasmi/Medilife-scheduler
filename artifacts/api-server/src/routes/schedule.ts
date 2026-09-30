import { ReplitConnectors } from "@replit/connectors-sdk";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateScheduleSlotBody,
  DeleteScheduleSlotParams,
  GenerateScheduleBody,
  UpdateScheduleSlotBody,
  UpdateScheduleSlotParams,
} from "@workspace/api-zod";
import {
  addUtcDays,
  generateScheduleAssignments,
  listDates,
  type SchedulableStaff,
  type ShiftRecord,
} from "../lib/schedule-generator";

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

type StaffRow = {
  id: string;
  max_shifts_per_week: number;
  max_gardes_per_month: number | null;
};

type UserConstraintRow = {
  staff_id: string;
  max_hours_per_week: number;
  min_rest_hours: number;
  max_consecutive_nights: number;
  can_work_night: boolean;
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

function dateValue(value: string | Date) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function queryDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : value;
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
  if (from > to) {
    res.status(400).json({ error: "La date de début doit précéder ou correspondre à la date de fin." });
    return;
  }
  try {
    const contextFrom = addUtcDays(from, -14);
    const contextTo = addUtcDays(to, 7);
    const existingResponse = await requestSupabase(
      `/schedule_slots?select=id,staff_id,shift_date,shift_type,status,is_locked&shift_date=gte.${encodeURIComponent(contextFrom)}&shift_date=lte.${encodeURIComponent(contextTo)}`,
    );
    if (!existingResponse.ok) {
      sendError(res, await errorMessage(existingResponse));
      return;
    }
    const existing = (await existingResponse.json()) as Array<
      Pick<ScheduleRow, "id" | "staff_id" | "shift_date" | "shift_type" | "status" | "is_locked">
    >;

    const staffResponse = await requestSupabase(
      "/staff?select=id,max_shifts_per_week,max_gardes_per_month&is_active=eq.true&order=full_name.asc",
    );
    if (!staffResponse.ok) {
      sendError(res, await errorMessage(staffResponse));
      return;
    }
    const staffRows = (await staffResponse.json()) as StaffRow[];
    const constraintsResponse = staffRows.length
      ? await requestSupabase(
          `/user_constraints?staff_id=in.(${staffRows.map(({ id }) => id).join(",")})&select=staff_id,max_hours_per_week,min_rest_hours,max_consecutive_nights,can_work_night`,
        )
      : null;
    if (constraintsResponse && !constraintsResponse.ok) {
      sendError(res, await errorMessage(constraintsResponse));
      return;
    }

    const constraintRows = constraintsResponse
      ? ((await constraintsResponse.json()) as UserConstraintRow[])
      : [];
    const constraintsByStaffId = new Map(constraintRows.map(({ staff_id, ...constraint }) => [staff_id, constraint]));
    const missingConstraints = staffRows.find((member) => !constraintsByStaffId.has(member.id));
    if (missingConstraints) {
      res.status(409).json({ error: "Un membre actif n’a pas de contraintes enregistrées. Modifiez sa fiche puis réessayez." });
      return;
    }
    const staff: SchedulableStaff[] = staffRows.map((member) => ({
      ...member,
      constraints: constraintsByStaffId.get(member.id)!,
    }));
    const seedSlots: ShiftRecord[] = existing.filter((slot) =>
      slot.shift_date < from ||
      slot.shift_date > to ||
      (!full_reset && slot.is_locked),
    );
    const created = generateScheduleAssignments(listDates(from, to), staff, seedSlots);

    const deleteFilter = full_reset ? "" : "&is_locked=eq.false";
    const deleteResponse = await requestSupabase(
      `/schedule_slots?shift_date=gte.${encodeURIComponent(from)}&shift_date=lte.${encodeURIComponent(to)}${deleteFilter}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
    );
    if (!deleteResponse.ok) {
      sendError(res, await errorMessage(deleteResponse));
      return;
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