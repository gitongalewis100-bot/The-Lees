import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Turns one voice note into text. Called by the app after Done, before Send.
// Rules: the caller must be signed in and belong to a pair. One audio file, 5 MB at most.
// Rate limit: 30 calls per user per hour. The count is kept in this function instance's memory,
// so it is a best-effort limit; see supabase/functions/transcribe-voice/README.md.
// The language is not forced: Kiswahili and English are mixed in the same clips.
// Secrets: TRANSCRIBE_API_KEY (required). TRANSCRIBE_API_URL and TRANSCRIBE_MODEL are optional.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const MAX_BYTES = 5 * 1024 * 1024;
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 30_000;
const DEFAULT_URL = "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_MODEL = "whisper-1";

const calls = new Map<string, number[]>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Counts this call. Returns false when the user has used up the hour.
function withinLimit(userId: string): boolean {
  const now = Date.now();
  const recent = (calls.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    calls.set(userId, recent);
    return false;
  }
  recent.push(now);
  calls.set(userId, recent);
  return true;
}

function extensionFor(type: string): string {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  if (type.includes("mpeg")) return "mp3";
  return "webm";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const providerKey = Deno.env.get("TRANSCRIBE_API_KEY") ?? "";
  const providerUrl = Deno.env.get("TRANSCRIBE_API_URL") || DEFAULT_URL;
  const model = Deno.env.get("TRANSCRIBE_MODEL") || DEFAULT_MODEL;

  // The JWT must be valid.
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Sign in first." }, 401);
  const userId = userData.user.id;

  // The caller must belong to a pair.
  const admin = createClient(url, service);
  const member = await admin
    .from("pair_members")
    .select("pair_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (member.error) {
    console.error("member lookup failed", member.error.code ?? "error");
    return json({ error: "Try again." }, 500);
  }
  if (!member.data) return json({ error: "Not in a pair." }, 403);

  if (!withinLimit(userId)) {
    return json({ error: "Too many voice notes for now. Try again later." }, 429);
  }

  if (!providerKey) {
    console.error("TRANSCRIBE_API_KEY is not set");
    return json({ error: "Transcription isn't set up yet." }, 503);
  }

  let audio: Blob | null = null;
  try {
    const form = await req.formData();
    const got = form.get("audio");
    if (got instanceof Blob) audio = got;
  } catch {
    return json({ error: "Send one audio file." }, 400);
  }
  if (!audio || audio.size === 0) return json({ error: "Send one audio file." }, 400);
  if (audio.size > MAX_BYTES) return json({ error: "That clip is too large. Keep it under 5 MB." }, 413);
  if (audio.type && !audio.type.startsWith("audio/")) return json({ error: "Send an audio file." }, 415);

  // Only the clip goes to the provider. No user ids, no names, no pair ids.
  const upstream = new FormData();
  upstream.append("file", audio, "voice-note." + extensionFor(audio.type || ""));
  upstream.append("model", model);
  upstream.append("response_format", "json");

  let res: Response;
  try {
    res = await fetch(providerUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${providerKey}` },
      body: upstream,
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch {
    console.error("transcription provider unreachable");
    return json({ error: "Transcription didn't finish. Try again." }, 502);
  }
  if (!res.ok) {
    console.error("transcription provider status", res.status);
    return json({ error: "Transcription didn't finish. Try again." }, 502);
  }

  const data = await res.json().catch(() => null);
  const text = data && typeof data.text === "string" ? data.text.trim() : "";
  return json({ text });
});
