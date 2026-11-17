import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALERT = "New message from Mrs Lees. Open The Lees to read it.";
// Used when the recipient has a chat lock: no sender name, no preview.
const LOCKED_ALERT = "New message";

async function sameSecret(got: string, expected: string) {
  if (!expected) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(got)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const aa = new Uint8Array(a);
  const bb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 401 });
  const expected = Deno.env.get("WEBHOOK_SECRET") ?? "";
  const got = req.headers.get("x-webhook-secret") ?? "";
  if (!(await sameSecret(got, expected))) return new Response(null, { status: 401 });

  const body = await req.json().catch(() => null);
  const record = body?.record ?? null;
  const id = record?.id;
  const senderId = record?.sender_id;
  const pairId = record?.pair_id;
  const createdAt = record?.created_at;
  if (!id || !senderId || !pairId || !createdAt) return new Response(null, { status: 200 });
  if (record.deleted === true) return new Response(null, { status: 200 });
  // A quiet message sends no alert at all. The recipient still sees it in the chat.
  if (record.quiet === true) return new Response(null, { status: 200 });

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(url, service);
  const member = await admin
    .from("pair_members")
    .select("side")
    .eq("user_id", senderId)
    .eq("pair_id", pairId)
    .maybeSingle();
  if (member.error) {
    console.error("member lookup failed", member.error.code ?? "error");
    return new Response(null, { status: 500 });
  }
  if (!member.data || member.data.side !== "Agnes") return new Response(null, { status: 200 });

  // If the recipient has a chat lock, the alert is generic and names no sender.
  const recipient = await admin
    .from("pair_members")
    .select("user_id")
    .eq("pair_id", pairId)
    .neq("user_id", senderId)
    .maybeSingle();
  let alertText = ALERT;
  if (!recipient.error && recipient.data?.user_id) {
    const lock = await admin
      .from("chat_locks")
      .select("user_id")
      .eq("pair_id", pairId)
      .eq("user_id", recipient.data.user_id)
      .maybeSingle();
    if (!lock.error && lock.data) alertText = LOCKED_ALERT;
  }

  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!chatId) {
    console.error("chat id not set");
    return new Response(null, { status: 200 });
  }
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  if (!token) {
    console.error("telegram token missing");
    return new Response(null, { status: 500 });
  }

  const seen = await admin.from("notify_log").select("message_id").eq("message_id", id).maybeSingle();
  if (seen.error) {
    console.error("notify_log read failed", seen.error.code ?? "error");
    return new Response(null, { status: 500 });
  }
  if (seen.data) return new Response(null, { status: 200 });

  const claimed = await admin.from("notify_log").insert({ message_id: id });
  if (claimed.error) {
    if (claimed.error.code === "23505") return new Response(null, { status: 200 });
    console.error("notify_log insert failed", claimed.error.code ?? "error");
    return new Response(null, { status: 500 });
  }

  try {
    const sent = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: alertText }),
    });
    await sent.body?.cancel();
    if (!sent.ok) {
      console.error("telegram send failed", sent.status);
      await admin.from("notify_log").delete().eq("message_id", id);
      return new Response(null, { status: 500 });
    }
  } catch {
    console.error("telegram send failed");
    await admin.from("notify_log").delete().eq("message_id", id);
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 200 });
});
