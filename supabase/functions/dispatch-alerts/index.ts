// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async () => {
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

  for (const item of queue ?? []) {
    // TODO:
    // 1) Buscar dados do cliente/OS relacionados
    // 2) Disparar WhatsApp API
    // 3) Disparar Email provider
    // 4) Registrar resultado de entrega

    const { error: markError } = await supabase
      .from("alert_dispatch_queue")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("id", item.id);

    if (!markError) processed += 1;
  }

  return new Response(JSON.stringify({ ok: true, processed }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
