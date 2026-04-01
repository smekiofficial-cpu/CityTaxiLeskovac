import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Action: create a new ride
    if (!action || action === "create_ride") {
      const { pickup_address, destination_address, fare, notes } = body;

      if (!pickup_address || pickup_address.trim() === "") {
        return new Response(
          JSON.stringify({ success: false, error: "Adresa polaska je obavezna" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find an available driver with an active vehicle
      let assignedDriverId: string | null = null;
      let assignedVehicleId: string | null = null;
      let driverName = "";

      const { data: availableDrivers } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("status", "available");

      if (availableDrivers && availableDrivers.length > 0) {
        for (const driver of availableDrivers) {
          const { data: vehicle } = await supabase
            .from("vehicles")
            .select("id, registration")
            .eq("current_driver_id", driver.id)
            .eq("is_active", true)
            .single();

          if (vehicle) {
            assignedDriverId = driver.id;
            assignedVehicleId = vehicle.id;
            driverName = driver.full_name || "Vozač";
            break;
          }
        }
      }

      const rideData: Record<string, unknown> = {
        pickup_address: pickup_address.trim(),
        destination_address: destination_address?.trim() || null,
        fare: fare || null,
        notes: notes || "Poručeno putem AI agenta",
        status: assignedDriverId ? "assigned" : "pending",
        assigned_driver_id: assignedDriverId,
        assigned_vehicle_id: assignedVehicleId,
      };

      const { data, error } = await supabase
        .from("rides")
        .insert(rideData)
        .select()
        .single();

      if (error) {
        console.error("Ride creation error:", error);
        throw new Error(error.message);
      }

      const destText = destination_address ? ` do ${destination_address.trim()}` : "";
      const fareText = fare ? ` Cena: ${fare} RSD.` : "";
      const message = assignedDriverId
        ? `Vožnja kreirana i dodeljena vozaču ${driverName}. Polazak: ${pickup_address}${destText}.${fareText} Vozilo stiže za 5-6 minuta.`
        : `Vožnja kreirana. Polazak: ${pickup_address}${destText}.${fareText} Trenutno nema slobodnih vozača, dispečer će dodeliti vozilo.`;

      return new Response(
        JSON.stringify({
          success: true,
          ride_id: data.id,
          driver_assigned: !!assignedDriverId,
          driver_name: driverName,
          message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: cancel a ride
    if (action === "cancel_ride") {
      const { pickup_address } = body;

      // Find the most recent active ride matching the address
      let query = supabase
        .from("rides")
        .select("id, pickup_address, status")
        .in("status", ["pending", "assigned", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: rides } = await query;

      if (!rides || rides.length === 0) {
        return new Response(
          JSON.stringify({ success: false, message: "Nema aktivnih vožnji za otkazivanje." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If address provided, try to match
      let rideToCancel = rides[0];
      if (pickup_address) {
        const match = rides.find(r =>
          r.pickup_address.toLowerCase().includes(pickup_address.toLowerCase())
        );
        if (match) rideToCancel = match;
      }

      const { error } = await supabase
        .from("rides")
        .update({ status: "cancelled" })
        .eq("id", rideToCancel.id);

      if (error) throw new Error(error.message);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Vožnja za adresu "${rideToCancel.pickup_address}" je uspešno otkazana.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: get taxi info
    if (action === "get_info") {
      const { data: drivers } = await supabase
        .from("profiles")
        .select("id, status")
        .eq("status", "available");

      const { data: activeRides } = await supabase
        .from("rides")
        .select("id")
        .in("status", ["pending", "assigned", "in_progress"]);

      const availableCount = drivers?.length || 0;
      const activeCount = activeRides?.length || 0;

      return new Response(
        JSON.stringify({
          success: true,
          info: {
            company_name: "City Taxi Leskovac",
            phone: "0800 211 111",
            available_drivers: availableCount,
            active_rides: activeCount,
            working_hours: "0-24, svakog dana",
            payment: "Gotovina",
          },
          message: `City Taxi Leskovac - telefon 0800 211 111. Radimo 0-24. Trenutno ${availableCount} slobodnih vozača, ${activeCount} aktivnih vožnji. Plaćanje gotovinom.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Nepoznata akcija" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("create-ride-voice error:", e);
    return new Response(
      JSON.stringify({ success: false, error: "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
