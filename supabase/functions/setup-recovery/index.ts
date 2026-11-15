import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function norm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function hex(bytes: Uint8Array) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashAnswer(answer: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(answer),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  return hex(new Uint8Array(bits));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const q1 = Number(body?.q1);
  const q2 = Number(body?.q2);
  const a1 = norm(String(body?.a1 ?? ""));
  const a2 = norm(String(body?.a2 ?? ""));
  if (!Number.isInteger(q1) || !Number.isInteger(q2) || q1 < 0 || q1 > 7 || q2 < 0 || q2 > 7 || q1 === q2 || a1.length < 2 || a2.length < 2) {
    return Response.json({ error: "Choose two different questions and write both answers." }, { status: 400 });
  }
  const admin = createClient(url, service);
  const { data: member, error: memberError } = await admin
    .from("pair_members")
    .select("side")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (memberError || !member) {
    return Response.json({ error: "Sign in on your side first." }, { status: 400 });
  }
  const salt1 = crypto.getRandomValues(new Uint8Array(16));
  const salt2 = crypto.getRandomValues(new Uint8Array(16));
  const hash1 = await hashAnswer(a1, salt1);
  const hash2 = await hashAnswer(a2, salt2);
  const saved = await admin.from("recovery_answers").upsert({
    user_id: userData.user.id,
    salt1: hex(salt1),
    hash1,
    salt2: hex(salt2),
    hash2,
  });
  if (saved.error) return Response.json({ error: "Could not save recovery answers." }, { status: 500 });
  const prompts = await admin.from("recovery_questions").upsert({
    user_id: userData.user.id,
    side: member.side,
    q1,
    q2,
  });
  if (prompts.error) return Response.json({ error: "Could not save recovery answers." }, { status: 500 });
  return Response.json({ ok: true });
});
