import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DispatcherLayout from "@/components/dispatcher/DispatcherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Vehicle {
  id: string;
  registration: string;
  model: string;
  color: string;
  current_driver_id: string | null;
  is_active: boolean;
}

interface Driver {
  id: string;
  full_name: string | null;
  email: string;
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ registration: "", model: "", color: "", current_driver_id: "" });
  const { toast } = useToast();

  const fetchData = async () => {
    const [vRes, dRes] = await Promise.all([
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, email")
        .in("id", (await supabase.from("user_roles").select("user_id").eq("role", "driver")).data?.map(r => r.user_id) ?? []),
    ]);
    if (vRes.data) setVehicles(vRes.data);
    if (dRes.data) setDrivers(dRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    const { error } = await supabase.from("vehicles").insert({
      registration: form.registration,
      model: form.model,
      color: form.color,
      current_driver_id: form.current_driver_id || null,
    });
    if (error) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Uspeh", description: "Vozilo je dodato" });
      setForm({ registration: "", model: "", color: "", current_driver_id: "" });
      setOpen(false);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("vehicles").delete().eq("id", id);
    fetchData();
  };

  const handleAssignDriver = async (vehicleId: string, driverId: string | null) => {
    const { error } = await supabase.from("vehicles").update({ current_driver_id: driverId }).eq("id", vehicleId);
    if (error) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Uspeh", description: "Vozač je dodeljen" });
      fetchData();
    }
  };

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return "—";
    const d = drivers.find((d) => d.id === driverId);
    return d ? d.full_name || d.email : "—";
  };

  return (
    <DispatcherLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Upravljanje vozilima</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Dodaj vozilo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Novo vozilo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label>Registracija</Label><Input value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} placeholder="LE-123-AB" /></div>
                <div><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Škoda Octavia" /></div>
                <div><Label>Boja</Label><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Žuta" /></div>
                <div>
                  <Label>Dodeli vozaču</Label>
                  <Select value={form.current_driver_id} onValueChange={(v) => setForm({ ...form, current_driver_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozača" /></SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.full_name || d.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleAdd}>Sačuvaj</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registracija</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Boja</TableHead>
                  <TableHead>Vozač</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Nema vozila. Dodajte prvo vozilo.
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicles.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-semibold">{v.registration}</TableCell>
                      <TableCell>{v.model}</TableCell>
                      <TableCell>{v.color}</TableCell>
                      <TableCell>
                        <Select
                          value={v.current_driver_id || "none"}
                          onValueChange={(val) => handleAssignDriver(v.id, val === "none" ? null : val)}
                        >
                          <SelectTrigger className="w-[180px] h-8 text-sm">
                            <SelectValue placeholder="Izaberi vozača" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Bez vozača</SelectItem>
                            {drivers.map((d) => (
                              <SelectItem key={d.id} value={d.id}>{d.full_name || d.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DispatcherLayout>
  );
}
