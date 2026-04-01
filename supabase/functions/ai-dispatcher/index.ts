import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const tools = [
  {
    type: "function",
    function: {
      name: "create_ride",
      description: "Kreiraj novu vožnju. Ako je dostupan slobodan vozač sa aktivnim vozilom, automatski mu dodeli vožnju.",
      parameters: {
        type: "object",
        properties: {
          pickup_address: { type: "string", description: "Adresa polaska" },
          destination_address: { type: "string", description: "Adresa destinacije (opciono)" },
          fare: { type: "number", description: "Cena vožnje u dinarima (opciono)" },
          notes: { type: "string", description: "Dodatne napomene (opciono)" },
        },
        required: ["pickup_address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_ride",
      description: "Otkaži aktivnu vožnju po adresi ili poslednjo kreiranu.",
      parameters: {
        type: "object",
        properties: {
          pickup_address: { type: "string", description: "Adresa polaska vožnje za otkazivanje (opciono, ako se ne navede otkazuje poslednju)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_ride",
      description: "Dodeli vožnju konkretnom vozaču po imenu.",
      parameters: {
        type: "object",
        properties: {
          ride_pickup: { type: "string", description: "Adresa polaska vožnje" },
          driver_name: { type: "string", description: "Ime vozača" },
        },
        required: ["ride_pickup", "driver_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_active_rides",
      description: "Prikaži listu svih aktivnih vožnji (pending, assigned, in_progress).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_drivers_status",
      description: "Prikaži listu svih vozača sa njihovim statusom i dodeljenim vozilom.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "set_driver_status",
      description: "Promeni status vozača (available, busy, offline).",
      parameters: {
        type: "object",
        properties: {
          driver_name: { type: "string", description: "Ime vozača" },
          status: { type: "string", enum: ["available", "busy", "offline"], description: "Novi status" },
        },
        required: ["driver_name", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_statistics",
      description: "Prikaži statistiku: ukupne vožnje danas, aktivne vožnje, slobodne vozače, završene vožnje i ukupnu zaradu.",
      parameters: { type: "object", properties: {} },
    },
  },
];

async function executeTool(name: string, args: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  switch (name) {
    case "create_ride": {
      const { pickup_address, destination_address, fare, notes } = args as any;

      let assignedDriverId: string | null = null;
      let assignedVehicleId: string | null = null;
      let driverName = "";

      const { data: drivers } = await supabase.from("profiles").select("id, full_name").eq("status", "available");
      if (drivers?.length) {
        for (const d of drivers) {
          const { data: v } = await supabase.from("vehicles").select("id, registration").eq("current_driver_id", d.id).eq("is_active", true).single();
          if (v) { assignedDriverId = d.id; assignedVehicleId = v.id; driverName = d.full_name || "Vozač"; break; }
        }
      }

      const { data, error } = await supabase.from("rides").insert({
        pickup_address, destination_address: destination_address || null, fare: fare || null,
        notes: notes || "AI dispečer", status: assignedDriverId ? "assigned" : "pending",
        assigned_driver_id: assignedDriverId, assigned_vehicle_id: assignedVehicleId,
      }).select().single();

      if (error) return `Greška: ${error.message}`;
      const dest = destination_address ? ` → ${destination_address}` : "";
      const fareT = fare ? ` | Cena: ${fare} RSD` : "";
      return assignedDriverId
        ? `✅ Vožnja kreirana i dodeljena vozaču **${driverName}**. ${pickup_address}${dest}${fareT}`
        : `⏳ Vožnja kreirana: ${pickup_address}${dest}${fareT}. Nema slobodnih vozača — čeka dodelu.`;
    }

    case "cancel_ride": {
      const { pickup_address } = args as any;
      const { data: rides } = await supabase.from("rides").select("id, pickup_address, status")
        .in("status", ["pending", "assigned", "in_progress"]).order("created_at", { ascending: false }).limit(5);

      if (!rides?.length) return "Nema aktivnih vožnji za otkazivanje.";
      let ride = rides[0];
      if (pickup_address) {
        const match = rides.find((r: any) => r.pickup_address.toLowerCase().includes(pickup_address.toLowerCase()));
        if (match) ride = match;
      }
      const { error } = await supabase.from("rides").update({ status: "cancelled" }).eq("id", ride.id);
      if (error) return `Greška: ${error.message}`;
      return `❌ Vožnja za "${ride.pickup_address}" je otkazana.`;
    }

    case "assign_ride": {
      const { ride_pickup, driver_name } = args as any;
      const { data: rides } = await supabase.from("rides").select("id, pickup_address")
        .eq("status", "pending").order("created_at", { ascending: false }).limit(10);
      if (!rides?.length) return "Nema pending vožnji.";
      const ride = rides.find((r: any) => r.pickup_address.toLowerCase().includes(ride_pickup.toLowerCase())) || rides[0];

      const { data: drivers } = await supabase.from("profiles").select("id, full_name");
      const driver = drivers?.find((d: any) => d.full_name?.toLowerCase().includes(driver_name.toLowerCase()));
      if (!driver) return `Vozač "${driver_name}" nije pronađen.`;

      const { data: vehicle } = await supabase.from("vehicles").select("id").eq("current_driver_id", driver.id).eq("is_active", true).single();

      const { error } = await supabase.from("rides").update({
        status: "assigned", assigned_driver_id: driver.id,
        assigned_vehicle_id: vehicle?.id || null,
      }).eq("id", ride.id);
      if (error) return `Greška: ${error.message}`;
      return `✅ Vožnja "${ride.pickup_address}" dodeljena vozaču **${driver.full_name}**.`;
    }

    case "get_active_rides": {
      const { data } = await supabase.from("rides").select("id, pickup_address, destination_address, status, fare, assigned_driver_id, created_at, notes")
        .in("status", ["pending", "assigned", "in_progress"]).order("created_at", { ascending: false });

      if (!data?.length) return "Nema aktivnih vožnji.";

      const driverIds = [...new Set(data.filter(r => r.assigned_driver_id).map(r => r.assigned_driver_id))];
      let driverMap: Record<string, string> = {};
      if (driverIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", driverIds);
        profiles?.forEach(p => { driverMap[p.id] = p.full_name || "?"; });
      }

      const lines = data.map((r: any) => {
        const status = r.status === "pending" ? "⏳ Čeka" : r.status === "assigned" ? "🚕 Dodeljena" : "🔄 U toku";
        const driver = r.assigned_driver_id ? ` | Vozač: ${driverMap[r.assigned_driver_id] || "?"}` : "";
        const dest = r.destination_address ? ` → ${r.destination_address}` : "";
        const fare = r.fare ? ` | ${r.fare} RSD` : "";
        return `- ${status} **${r.pickup_address}**${dest}${driver}${fare}`;
      });
      return `**Aktivne vožnje (${data.length}):**\n${lines.join("\n")}`;
    }

    case "get_drivers_status": {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, status, phone");
      if (!profiles?.length) return "Nema registrovanih vozača.";

      const { data: vehicles } = await supabase.from("vehicles").select("current_driver_id, registration, model").eq("is_active", true);
      const vehicleMap: Record<string, string> = {};
      vehicles?.forEach(v => { if (v.current_driver_id) vehicleMap[v.current_driver_id] = `${v.model} (${v.registration})`; });

      const lines = profiles.map((p: any) => {
        const icon = p.status === "available" ? "🟢" : p.status === "busy" ? "🟡" : "🔴";
        const veh = vehicleMap[p.id] ? ` | 🚗 ${vehicleMap[p.id]}` : "";
        return `- ${icon} **${p.full_name || p.email}** — ${p.status}${veh}`;
      });
      return `**Vozači (${profiles.length}):**\n${lines.join("\n")}`;
    }

    case "set_driver_status": {
      const { driver_name, status } = args as any;
      const { data: profiles } = await supabase.from("profiles").select("id, full_name");
      const driver = profiles?.find((p: any) => p.full_name?.toLowerCase().includes(driver_name.toLowerCase()));
      if (!driver) return `Vozač "${driver_name}" nije pronađen.`;

      const { error } = await supabase.from("profiles").update({ status }).eq("id", driver.id);
      if (error) return `Greška: ${error.message}`;
      return `✅ Status vozača **${driver.full_name}** promenjen na **${status}**.`;
    }

    case "get_statistics": {
      const today = new Date().toISOString().split("T")[0];

      const { data: todayRides } = await supabase.from("rides").select("id, status, fare").gte("created_at", today);
      const { data: activeRides } = await supabase.from("rides").select("id").in("status", ["pending", "assigned", "in_progress"]);
      const { data: drivers } = await supabase.from("profiles").select("id, status");

      const total = todayRides?.length || 0;
      const completed = todayRides?.filter(r => r.status === "completed").length || 0;
      const cancelled = todayRides?.filter(r => r.status === "cancelled").length || 0;
      const revenue = todayRides?.filter(r => r.status === "completed" && r.fare).reduce((s, r) => s + Number(r.fare), 0) || 0;
      const active = activeRides?.length || 0;
      const available = drivers?.filter(d => d.status === "available").length || 0;
      const busy = drivers?.filter(d => d.status === "busy").length || 0;

      return `**📊 Statistika za danas:**\n- Ukupno vožnji: **${total}**\n- Aktivne: **${active}**\n- Završene: **${completed}**\n- Otkazane: **${cancelled}**\n- Prihod: **${revenue} RSD**\n- Slobodni vozači: **${available}**\n- Zauzeti: **${busy}**`;
    }

    default:
      return "Nepoznata komanda.";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Verify dispatcher or admin role
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["dispatcher", "admin"])
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = supabaseAdmin;

    const systemPrompt = `Ti si AI dispečer za City Taxi Leskovac. Govoriš srpski jezik.
Tvoje mogućnosti:
- Kreiraš vožnje za mušterije (pitaj za adresu polaska, opciono destinaciju i cenu)
- Otkazuješ vožnje
- Dodeliš vožnje konkretnim vozačima
- Pregledaš aktivne vožnje
- Pregledaš status vozača i menjaš im status
- Prikazuješ statistiku
- Razgovaraš sa mušterijama ljubazno i profesionalno

Kada mušterija želi vožnju, pitaj za adresu polaska. Opciono pitaj za destinaciju.
Budi koncizan i efikasan. Koristi emoji za bolju preglednost.
Telefon centrale: 0800 211 111. Radimo 0-24. Plaćanje gotovinom.`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // First call - may return tool calls
    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: aiMessages, tools }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      if (status === 429) return new Response(JSON.stringify({ error: "Previše zahteva, pokušajte ponovo." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Nedovoljno kredita." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error ${status}: ${text}`);
    }

    let result = await response.json();
    let assistantMessage = result.choices?.[0]?.message;

    // Handle tool calls loop (max 5 iterations)
    let iterations = 0;
    while (assistantMessage?.tool_calls && iterations < 5) {
      iterations++;
      const toolResults = [];

      for (const tc of assistantMessage.tool_calls) {
        const args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        console.log(`Tool call: ${tc.function.name}`, args);
        const toolResult = await executeTool(tc.function.name, args, supabase);
        toolResults.push({ role: "tool", tool_call_id: tc.id, content: toolResult });
      }

      // Follow-up call with tool results
      const followUp = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [...aiMessages, assistantMessage, ...toolResults],
          tools,
        }),
      });

      if (!followUp.ok) { const t = await followUp.text(); throw new Error(`AI follow-up error: ${t}`); }
      result = await followUp.json();
      assistantMessage = result.choices?.[0]?.message;
    }

    const content = assistantMessage?.content || "Nisam uspeo da obradim zahtev.";
    return new Response(JSON.stringify({ reply: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-dispatcher error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
