import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const RECURSOS = ["video", "chrome", "lab"] as const;

const bookingSchema = z.object({
  recurso: z.enum(RECURSOS),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  turno: z.enum(["matutino", "vespertino"]).nullable().optional(),
  aula: z.coerce.number().int().min(1).max(5),
  dia_semana: z.string().min(1).max(40),
  professor: z.string().min(1).max(120),
  componente: z.string().min(1).max(120),
  turma: z.string().min(1).max(40),
  objetivo: z.string().max(2000).default(""),
  origem_local_id: z.string().max(64).nullable().optional(),
  revisar: z.boolean().optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
  token: z.string().max(200).optional(),
  admin_password: z.string().max(200).optional(),
});

const PUBLIC_COLUMNS =
  "id, recurso, data, turno, aula, dia_semana, professor, componente, turma, objetivo, revisar, origem_local_id, created_at";

/** Rate limit simples por IP (janela deslizante em memória do worker). */
const hits = new Map<string, number[]>();
function rateLimited(ip: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 500) hits.clear();
  return list.length > limit;
}

function clientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function newToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/bookings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const db = await admin();
        const url = new URL(request.url);
        const recurso = url.searchParams.get("recurso");
        let query = db.from("bookings").select(PUBLIC_COLUMNS).order("data", { ascending: true });
        if (recurso && (RECURSOS as readonly string[]).includes(recurso)) {
          query = query.eq("recurso", recurso);
        }
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ bookings: data ?? [] });
      },

      POST: async ({ request }) => {
        if (rateLimited(clientIp(request))) return json({ error: "Muitas tentativas. Aguarde um minuto." }, 429);

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Corpo inválido." }, 400);
        }
        const parsed = bookingSchema.safeParse(payload);
        if (!parsed.success) return json({ error: "Dados inválidos.", detalhes: parsed.error.issues }, 400);

        const b = parsed.data;
        const db = await admin();

        // Reenvio da mesma reserva local: devolve a que já existe, nunca duplica.
        if (b.origem_local_id) {
          const { data: existing } = await db
            .from("bookings")
            .select("id, delete_token")
            .eq("origem_local_id", b.origem_local_id)
            .maybeSingle();
          if (existing) {
            return json({ id: existing.id, delete_token: existing.delete_token, already: true });
          }
        }

        const delete_token = newToken();
        const { data, error } = await db
          .from("bookings")
          .insert({
            recurso: b.recurso,
            data: b.data,
            turno: b.turno ?? null,
            aula: b.aula,
            dia_semana: b.dia_semana,
            professor: b.professor,
            componente: b.componente,
            turma: b.turma,
            objetivo: b.objetivo ?? "",
            origem_local_id: b.origem_local_id ?? null,
            revisar: b.revisar ?? false,
            delete_token,
          })
          .select("id")
          .single();

        if (error) {
          if (error.code === "23505" || error.message.includes("duplicate key")) {
            const { data: conflito } = await db
              .from("bookings")
              .select("professor, turma, aula, turno")
              .eq("recurso", b.recurso)
              .eq("data", b.data)
              .eq("aula", b.aula)
              .maybeSingle();
            return json({ error: "conflito", conflito: conflito ?? null }, 409);
          }
          return json({ error: error.message }, 500);
        }

        return json({ id: data.id, delete_token }, 201);
      },

      DELETE: async ({ request }) => {
        if (rateLimited(clientIp(request), 20)) return json({ error: "Muitas tentativas. Aguarde um minuto." }, 429);

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Corpo inválido." }, 400);
        }
        const parsed = deleteSchema.safeParse(payload);
        if (!parsed.success) return json({ error: "Dados inválidos." }, 400);
        const { id, token, admin_password } = parsed.data;

        const adminPassword = process.env["ADMIN_DELETE_PASSWORD"];
        const isAdmin = Boolean(admin_password && adminPassword && admin_password === adminPassword);

        const db = await admin();
        const { data: row, error: readError } = await db
          .from("bookings")
          .select("id, delete_token")
          .eq("id", id)
          .maybeSingle();
        if (readError) return json({ error: readError.message }, 500);
        if (!row) return json({ error: "Reserva não encontrada." }, 404);

        if (!isAdmin && (!token || token !== row.delete_token)) {
          return json(
            { error: "Somente quem criou a reserva (ou a coordenação) pode excluí-la." },
            403,
          );
        }

        const { error } = await db.from("bookings").delete().eq("id", id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      },
    },
  },
});
