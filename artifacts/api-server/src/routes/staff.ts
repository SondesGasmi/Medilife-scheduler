import { ReplitConnectors } from "@replit/connectors-sdk";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateStaffBody,
  DeleteStaffParams,
  UpdateStaffBody,
  UpdateStaffParams,
} from "@workspace/api-zod";

type SupabaseStaff = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialities: string[] | null;
  max_shifts_per_week: number;
  role: string;
  is_active: boolean;
  created_at: string;
};

type SupabaseError = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
};

const router: IRouter = Router();

function getSupabaseClient() {
  return new ReplitConnectors();
}

type ProxyInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

async function supabaseRequest(path: string, init: ProxyInit = {}) {
  return getSupabaseClient().proxy("supabase", `/rest/v1${path}`, init);
}

function toStaff(row: SupabaseStaff) {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone ?? null,
    speciality: row.specialities?.[0] ?? null,
    max_shifts_per_week: row.max_shifts_per_week,
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

async function readError(response: globalThis.Response) {
  const text = await response.text();
  let parsed: SupabaseError = {};
  try {
    parsed = JSON.parse(text) as SupabaseError;
  } catch {
    parsed = {};
  }

  return (
    parsed.message ??
    parsed.details ??
    text ??
    `Supabase returned HTTP ${response.status}`
  );
}

function sendProxyError(response: Response, message: string, status = 502) {
  const schemaMissing =
    message.includes("Could not find the table") ||
    message.includes("schema cache");
  response
    .status(schemaMissing ? 503 : status)
    .json({ error: schemaMissing ? "Le schéma MediLife n'est pas encore installé dans Supabase." : message });
}

router.get("/staff", async (req, res) => {
  try {
    const response = await supabaseRequest(
      "/staff?select=id,full_name,email,phone,specialities,max_shifts_per_week,role,is_active,created_at&order=created_at.desc",
    );
    if (!response.ok) {
      sendProxyError(res, await readError(response));
      return;
    }

    const rows = (await response.json()) as SupabaseStaff[];
    res.json(rows.map(toStaff));
  } catch (error) {
    req.log.error({ err: error }, "Unable to list staff");
    sendProxyError(res, "Impossible de charger le personnel.");
  }
});

router.get("/staff/summary", async (req, res) => {
  try {
    const response = await supabaseRequest(
      "/staff?select=max_shifts_per_week,role,is_active",
    );
    if (!response.ok) {
      sendProxyError(res, await readError(response));
      return;
    }

    const rows = (await response.json()) as Array<
      Pick<SupabaseStaff, "max_shifts_per_week" | "role" | "is_active">
    >;
    const active = rows.filter((row) => row.is_active);
    res.json({
      total: rows.length,
      active: active.length,
      radiologists: active.filter((row) => row.role === "radiologue").length,
      available_slots: active.reduce(
        (total, row) => total + row.max_shifts_per_week,
        0,
      ),
    });
  } catch (error) {
    req.log.error({ err: error }, "Unable to summarize staff");
    sendProxyError(res, "Impossible de charger le résumé du personnel.");
  }
});

router.post("/staff", async (req, res) => {
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Les informations du personnel sont invalides." });
    return;
  }

  const { full_name, email, phone, speciality, max_shifts_per_week } =
    parsed.data;

  try {
    const response = await supabaseRequest("/staff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        full_name,
        email,
        phone: phone ?? null,
        specialities: speciality ? [speciality] : [],
        max_shifts_per_week,
        role: "medecin",
        contract_type: "cdi",
        is_active: true,
      }),
    });

    if (!response.ok) {
      sendProxyError(res, await readError(response), response.status === 409 ? 409 : 502);
      return;
    }

    const rows = (await response.json()) as SupabaseStaff[];
    const staff = rows[0];
    if (!staff) {
      sendProxyError(res, "Supabase n'a pas renvoyé le membre créé.");
      return;
    }
    res.status(201).json(toStaff(staff));
  } catch (error) {
    req.log.error({ err: error }, "Unable to create staff");
    sendProxyError(res, "Impossible d'ajouter ce membre du personnel.");
  }
});

router.patch("/staff/:id", async (req, res) => {
  const params = UpdateStaffParams.safeParse(req.params);
  const parsed = UpdateStaffBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Les informations du personnel sont invalides." });
    return;
  }

  const payload = {
    ...(parsed.data.full_name === undefined
      ? {}
      : { full_name: parsed.data.full_name }),
    ...(parsed.data.email === undefined ? {} : { email: parsed.data.email }),
    ...(parsed.data.phone === undefined ? {} : { phone: parsed.data.phone ?? null }),
    ...(parsed.data.speciality === undefined
      ? {}
      : { specialities: parsed.data.speciality ? [parsed.data.speciality] : [] }),
    ...(parsed.data.max_shifts_per_week === undefined
      ? {}
      : { max_shifts_per_week: parsed.data.max_shifts_per_week }),
  };

  try {
    const response = await supabaseRequest(
      `/staff?id=eq.${encodeURIComponent(params.data.id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      sendProxyError(res, await readError(response));
      return;
    }

    const rows = (await response.json()) as SupabaseStaff[];
    const staff = rows[0];
    if (!staff) {
      res.status(404).json({ error: "Membre du personnel introuvable." });
      return;
    }
    res.json(toStaff(staff));
  } catch (error) {
    req.log.error({ err: error }, "Unable to update staff");
    sendProxyError(res, "Impossible de modifier ce membre du personnel.");
  }
});

router.delete("/staff/:id", async (req, res) => {
  const params = DeleteStaffParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Identifiant du personnel invalide." });
    return;
  }

  try {
    const response = await supabaseRequest(
      `/staff?id=eq.${encodeURIComponent(params.data.id)}`,
      {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      },
    );
    if (!response.ok) {
      sendProxyError(res, await readError(response));
      return;
    }

    const rows = (await response.json()) as SupabaseStaff[];
    if (rows.length === 0) {
      res.status(404).json({ error: "Membre du personnel introuvable." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Unable to delete staff");
    sendProxyError(res, "Impossible de supprimer ce membre du personnel.");
  }
});

export default router;