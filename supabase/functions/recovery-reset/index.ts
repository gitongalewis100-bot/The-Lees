import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GENERIC = "Those answers don't match.";

function norm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function hexToBytes(hexText: string) {
  const out = new Uint8Array(hexText.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hexText.slice(i * 2, i * 2 + 2), 16);
  return out;
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

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(url, service);
  const body = await req.json().catch(() => null);
  const side = String(body?.side ?? "");
  const a1 = norm(String(body?.a1 ?? ""));
  const a2 = norm(String(body?.a2 ?? ""));
  const password = String(body?.password ?? "");
  if (side !== "Lewis" && side !== "Agnes") {
    return Response.json({ error: GENERIC }, { status: 400 });
  }
  const { data: member } = await admin.from("pair_members").select("user_id").eq("side", side).maybeSingle();
  if (!member) return Response.json({ error: GENERIC }, { status: 400 });
  const { data: attempt } = await admin
    .from("recovery_attempts")
    .select("failure_count, locked_until")
    .eq("user_id", member.user_id)
    .maybeSingle();
  if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > Date.now()) {
    return Response.json({ error: GENERIC }, { status: 400 });
  }
  const { data: answers } = await admin
    .from("recovery_answers")
    .select("salt1, hash1, salt2, hash2")
    .eq("user_id", member.user_id)
    .maybeSingle();
  const h1 = answers ? await hashAnswer(a1, hexToBytes(answers.salt1)) : "";
  const h2 = answers ? await hashAnswer(a2, hexToBytes(answers.salt2)) : "";
  const ok = !!answers && same(h1, answers.hash1) && same(h2, answers.hash2);
  if (!ok) {
    const count = (attempt?.failure_count ?? 0) + 1;
    const locked = count >= 5;
    await admin.from("recovery_attempts").upsert({
      user_id: member.user_id,
      failure_count: count,
      locked_until: locked ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
    });
    return Response.json({ error: GENERIC }, { status: 400 });
  }
  if (password.length < 4) {
    return Response.json({ error: "Use at least 4 characters." }, { status: 400 });
  }
  const updated = await admin.auth.admin.updateUserById(member.user_id, { password });
  if (updated.error) return Response.json({ error: GENERIC }, { status: 400 });
  await admin.from("recovery_attempts").upsert({
    user_id: member.user_id,
    failure_count: 0,
    locked_until: null,
  });
  return Response.json({ ok: true });
});
