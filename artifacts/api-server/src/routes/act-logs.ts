import { ReplitConnectors } from "@replit/connectors-sdk";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateActLogBody,
  DeleteActLogParams,
  ListActLogsQueryParams,
  UpdateActLogBody,
  UpdateActLogParams,
} from "@workspace/api-zod";

type SupabaseActLog = {
  id: string;
  staff_id: string;
  act_id: string;
  schedule_slot_id: string | null;
  performed_at: string;
  quantity: number;
  unit_price: number | string;
  total_amount: number | string;
  entered_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
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

function toActLog(row: SupabaseActLog) {
  return {
    ...row,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
    total_amount: Number(row.total_amount),
  };
}

router.get("/act-logs", async (req: Request, res: Response) => {
  const parsed = ListActLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Les filtres de saisie sont invalides." });
    return;
  }

  const params = new URLSearchParams({
    select: "id,staff_id,act_id,schedule_slot_id,performed_at,quantity,unit_price,total_amount,entered_by,notes,created_at,updated_at",
    order: "performed_at.desc,created_at.desc",
  });
  if (parsed.data.from) params.set("performed_at", `gte.${parsed.data.from}`);
  if (parsed.data.to) params.append("performed_at", `lte.${parsed.data.to}`);
  if (parsed.data.staff_id) params.set("staff_id", `eq.${parsed.data.staff_id}`);

  try {
    const response = await requestSupabase(`/act_logs?${params.toString()}`);
    if (!response.ok) {
      sendError(res, await errorMessage(response));
      return;
    }
    res.json(((await response.json()) as SupabaseActLog[]).map(toActLog));
  } catch (error) {
    req.log.error({ err: error }, "Unable to list act logs");
    sendError(res, "Impossible de charger les saisies d'actes.");
  }
});

router.post("/act-logs", async (req: Request, res: Response) => {
  const parsed = CreateActLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Les informations de l'acte sont invalides." });
    return;
  }

  try {
    const response = await requestSupabase("/act_logs", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(parsed.data),
    });
    if (!response.ok) {
      sendError(res, await errorMessage(response), response.status === 409 ? 409 : 502);
      return;
    }
    const row = ((await response.json()) as SupabaseActLog[])[0];
    if (!row) {
      sendError(res, "Supabase n'a pas renvoyé la saisie créée.");
      return;
    }
    res.status(201).json(toActLog(row));
  } catch (error) {
    req.log.error({ err: error }, "Unable to create act log");
    sendError(res, "Impossible d'enregistrer l'acte.");
  }
});

router.patch("/act-logs/:id", async (req: Request, res: Response) => {
  const params = UpdateActLogParams.safeParse(req.params);
  const parsed = UpdateActLogBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Les informations de l'acte sont invalides." });
    return;
  }

  try {
    const response = await requestSupabase(`/act_logs?id=eq.${encodeURIComponent(params.data.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(parsed.data),
    });
    if (!response.ok) {
      sendError(res, await errorMessage(response));
      return;
    }
    const row = ((await response.json()) as SupabaseActLog[])[0];
    if (!row) {
      res.status(404).json({ error: "Saisie introuvable." });
      return;
    }
    res.json(toActLog(row));
  } catch (error) {
    req.log.error({ err: error }, "Unable to update act log");
    sendError(res, "Impossible de modifier la saisie.");
  }
});

router.delete("/act-logs/:id", async (req: Request, res: Response) => {
  const params = DeleteActLogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Identifiant de saisie invalide." });
    return;
  }

  try {
    const response = await requestSupabase(`/act_logs?id=eq.${encodeURIComponent(params.data.id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    });
    if (!response.ok) {
      sendError(res, await errorMessage(response));
      return;
    }
    if (((await response.json()) as SupabaseActLog[]).length === 0) {
      res.status(404).json({ error: "Saisie introuvable." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Unable to delete act log");
    sendError(res, "Impossible de supprimer la saisie.");
  }
});

export default router;