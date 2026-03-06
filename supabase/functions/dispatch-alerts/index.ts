// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ALERTS_AUTOPROCESS = (Deno.env.get("ALERTS_AUTOPROCESS") || "").toLowerCase() === "true";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "Function misconfigured: missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: queue, error } = await supabase
    .from("alert_dispatch_queue")
    .select("*")
    .eq("processed", false)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let skipped = 0;
  const total = queue?.length || 0;

  for (const item of queue ?? []) {
    // Prevent message loss while provider integrations are incomplete.
    if (!ALERTS_AUTOPROCESS) {
      skipped += 1;
      continue;
    }

    const { error: markError } = await supabase
      .from("alert_dispatch_queue")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("id", item.id);

    if (markError) {
      skipped += 1;
      continue;
    }
    processed += 1;
  }

  return new Response(JSON.stringify({ ok: true, total, processed, skipped, autoprocess: ALERTS_AUTOPROCESS }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
