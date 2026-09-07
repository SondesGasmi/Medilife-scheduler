import { ReplitConnectors } from "@replit/connectors-sdk";
import { Router, type IRouter, type Request, type Response } from "express";

type SupabaseAct = {
  id: string;
  code: string;
  name_fr: string;
  category: string;
  base_price: number | string;
  is_active: boolean;
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
  const missingSchema = message.includes("Could not find the table") || message.includes("schema cache");
  res.status(missingSchema ? 503 : status).json({
    error: missingSchema ? "Le schéma MediLife n'est pas encore installé dans Supabase." : message,
  });
}

function toAct(row: SupabaseAct) {
  return {
    ...row,
    base_price: Number(row.base_price),
  };
}

router.get("/acts", async (req: Request, res: Response) => {
  try {
    const response = await requestSupabase("/acts?select=id,code,name_fr,category,base_price,is_active,created_at,updated_at&order=name_fr.asc");
    if (!response.ok) {
      sendError(res, await errorMessage(response));
      return;
    }
    res.json(((await response.json()) as SupabaseAct[]).map(toAct));
  } catch (error) {
    req.log.error({ err: error }, "Unable to list acts");
    sendError(res, "Impossible de charger le catalogue des actes.");
  }
});

export default router;