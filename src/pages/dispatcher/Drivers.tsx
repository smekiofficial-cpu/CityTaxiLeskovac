import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DispatcherLayout from "@/components/dispatcher/DispatcherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DriverProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: string;
}

export default function Drivers() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", phone: "" });
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const fetchDrivers = async () => {
    const rolesRes = await supabase.from("user_roles").select("user_id").eq("role", "driver");
    const driverIds = rolesRes.data?.map((r) => r.user_id) ?? [];
    if (driverIds.length === 0) { setDrivers([]); return; }
    const { data } = await supabase.from("profiles").select("*").in("id", driverIds);
    if (data) setDrivers(data);
  };

  useEffect(() => { fetchDrivers(); }, []);

  const handleCreate = async () => {
    if (!form.email || !form.password) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast({ title: "Greška", description: "Unesite validan email format (npr. ime@domen.com)", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Greška", description: "Lozinka mora imati minimum 6 karaktera", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      const response = await supabase.functions.invoke("create-driver", {
        body: { email: form.email, password: form.password, full_name: form.full_name, phone: form.phone },
      });
      if (response.error) throw new Error(response.error.message);
      toast({ title: "Uspeh", description: "Nalog vozača je kreiran" });
      setForm({ email: "", password: "", full_name: "", phone: "" });
      setOpen(false);
      fetchDrivers();
    } catch (error: any) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === "available") return "bg-taxi-green text-white";
    if (s === "busy") return "bg-taxi-red text-white";
    return "bg-muted text-muted-foreground";
  };

  const statusLabel = (s: string) => {
    if (s === "available") return "Slobodan";
    if (s === "busy") return "Zauzet";
    return "Van mreže";
  };

  const handleDelete = async (driverId: string) => {
    try {
      const response = await supabase.functions.invoke("delete-driver", {
        body: { driver_id: driverId },
      });
      if (response.error) throw new Error(response.error.message);
      toast({ title: "Uspeh", description: "Vozač je uklonjen" });
      fetchDrivers();
    } catch (error: any) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    }
  };

  return (
    <DispatcherLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Upravljanje vozačima</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Novi vozač</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Kreiraj nalog vozača</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label>Ime i prezime</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Petar Petrović" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vozac@email.com" /></div>
                <div><Label>Lozinka</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 6 karaktera" /></div>
                <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+381..." /></div>
                <Button className="w-full" onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? "Kreiranje..." : "Kreiraj nalog"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ime</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead className="text-right">Akcije</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Nema vozača. Kreirajte prvi nalog.
                    </TableCell>
                  </TableRow>
                ) : (
                  drivers.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-semibold">{d.full_name || "—"}</TableCell>
                      <TableCell>{d.email}</TableCell>
                      <TableCell>{d.phone || "—"}</TableCell>
                      <TableCell><Badge className={statusColor(d.status)}>{statusLabel(d.status)}</Badge></TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Ukloni vozača?</AlertDialogTitle>
                              <AlertDialogDescription>Ova akcija je nepovratna. Vozač {d.full_name || d.email} će biti trajno uklonjen.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Otkaži</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(d.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Ukloni</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
