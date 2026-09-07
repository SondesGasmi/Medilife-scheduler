import { ReplitConnectors } from "@replit/connectors-sdk";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

async function requestSupabase(path: string) {
  return new ReplitConnectors().proxy("supabase", `/rest/v1${path}`);
}

router.get("/remuneration", async (req: Request, res: Response) => {
  try {
    const response = await requestSupabase(
      "/v_staff_monthly_remuneration?select=staff_id,full_name,month,acts_count,total_remuneration&order=month.desc,full_name.asc",
    );
    if (!response.ok) {
      const text = await response.text();
      const missingSchema = text.includes("Could not find") || text.includes("schema cache");
      res.status(missingSchema ? 503 : 502).json({
        error: missingSchema ? "Le schéma MediLife n'est pas encore installé dans Supabase." : text,
      });
      return;
    }

    const rows = (await response.json()) as Array<Record<string, unknown>>;
    res.json(rows.map((row) => ({
      ...row,
      acts_count: Number(row.acts_count),
      total_remuneration: Number(row.total_remuneration),
    })));
  } catch (error) {
    req.log.error({ err: error }, "Unable to list remuneration");
    res.status(502).json({ error: "Impossible de charger la rémunération." });
  }
});

export default router;