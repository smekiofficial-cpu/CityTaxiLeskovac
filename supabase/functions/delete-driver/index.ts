import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const deleteDriverSchema = z.object({
  driver_id: z.string().uuid("Invalid driver ID format"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is dispatcher
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) throw new Error("Not authenticated");

    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["dispatcher", "admin"]);
    if (!callerRoles || callerRoles.length === 0) throw new Error("Only dispatchers can delete drivers");

    const body = await req.json();
    const input = deleteDriverSchema.parse(body);

    // Unassign from vehicles
    await supabaseAdmin.from("vehicles").update({ current_driver_id: null }).eq("current_driver_id", input.driver_id);

    // Unassign from active rides
    await supabaseAdmin.from("rides").update({ assigned_driver_id: null, status: "pending" }).eq("assigned_driver_id", input.driver_id).in("status", ["assigned", "in_progress"]);

    // Delete vehicle locations
    await supabaseAdmin.from("vehicle_locations").delete().eq("driver_id", input.driver_id);

    // Delete role
    await supabaseAdmin.from("user_roles").delete().eq("user_id", input.driver_id);

    // Delete profile
    await supabaseAdmin.from("profiles").delete().eq("id", input.driver_id);

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(input.driver_id);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("delete-driver error:", error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Invalid input", details: error.errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const safeMessages = ["Not authenticated", "Only dispatchers can delete drivers"];
    const message = safeMessages.includes(error.message) ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
