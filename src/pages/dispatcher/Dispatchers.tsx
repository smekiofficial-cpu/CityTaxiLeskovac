import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DispatcherLayout from "@/components/dispatcher/DispatcherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Shield, ShieldCheck, Trash2, Lock, Eye, EyeOff, Copy, LogOut, Video, VideoOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DispatcherProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  initial_password: string | null;
}

export default function Dispatchers() {
  const { user, role } = useAuth();
  const [dispatchers, setDispatchers] = useState<DispatcherProfile[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isAdmin = role === "admin";

  const handleLogoutAll = async () => {
    setIsLoggingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke("logout-all");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Uspeh",
        description: `Sve sesije su odjavljene (${data.sessions_cleared || 0} sesija)`,
      });
      // Sign out current user too
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const fetchDispatchers = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["dispatcher", "admin"]);
    
    const ids = roles?.map((r) => r.user_id) ?? [];
    if (ids.length === 0) { setDispatchers([]); return; }

    const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
    
    // Fetch credentials (only admin can see these via RLS)
    const { data: creds } = await supabase.from("dispatcher_credentials").select("user_id, initial_password");
    const credMap = new Map((creds ?? []).map(c => [c.user_id, c.initial_password]));

    if (profiles && roles) {
      const roleMap = new Map(roles.map(r => [r.user_id, r.role]));
      setDispatchers(profiles.map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: roleMap.get(p.id) || "dispatcher",
        initial_password: credMap.get(p.id) || null,
      })));
    }
  };

  useEffect(() => { fetchDispatchers(); }, []);

  const handleCreate = async () => {
    if (!form.email || !form.password) return;
    if (form.password.length < 8) {
      toast({ title: "Greška", description: "Lozinka mora imati minimum 8 karaktera", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      const response = await supabase.functions.invoke("create-dispatcher", {
        body: { email: form.email, password: form.password, full_name: form.full_name },
      });
      if (response.error) throw new Error(response.error.message);
      const data = response.data;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Uspeh", description: "Dispečerski nalog je kreiran" });
      setForm({ email: "", password: "", full_name: "" });
      setOpen(false);
      fetchDispatchers();
    } catch (error: any) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (dispatcherId: string) => {
    try {
      const response = await supabase.functions.invoke("delete-dispatcher", {
        body: { dispatcher_id: dispatcherId },
      });
      if (response.error) throw new Error(response.error.message);
      const data = response.data;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Uspeh", description: "Dispečer je uklonjen" });
      fetchDispatchers();
    } catch (error: any) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    }
  };

  return (
    <DispatcherLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Upravljanje dispečerima
          </h1>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                    <LogOut className="w-4 h-4 mr-2" />
                    Odjavi sve sesije
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Odjavi sve sesije?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Svi korisnici (uključujući i vas) će biti odjavljeni i moraće ponovo da se prijave.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Otkaži</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogoutAll}
                      disabled={isLoggingOut}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isLoggingOut ? "Odjavljujem..." : "Odjavi sve"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" /> Novi dispečer</Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Kreiraj dispečerski nalog</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Ime i prezime</Label>
                    <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Ime Prezime" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@primer.com" />
                  </div>
                  <div>
                    <Label>Lozinka</Label>
                    <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 8 karaktera" />
                  </div>
                  <Button className="w-full" onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? "Kreiranje..." : "Kreiraj nalog"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          )}
        </div>

        {!isAdmin && (
          <Card className="border-primary/20">
            <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
              <Lock className="w-5 h-5" />
              <span>Samo admin može dodavati i uklanjati dispečerske naloge.</span>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ime</TableHead>
                  <TableHead>Email</TableHead>
                  {isAdmin && <TableHead>Lozinka</TableHead>}
                  <TableHead>Uloga</TableHead>
                  {isAdmin && <TableHead>Snimanje</TableHead>}
                  {isAdmin && <TableHead className="text-right">Akcije</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatchers.length === 0 ? (
                  <TableRow>
                   <TableCell colSpan={isAdmin ? 6 : 3} className="text-center py-8 text-muted-foreground">
                      <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Nema dispečera.
                    </TableCell>
                  </TableRow>
                ) : (
                  dispatchers.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-semibold">{d.full_name || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{d.email}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          {d.initial_password ? (
                            <div className="flex items-center gap-1.5">
                              <code className="text-sm font-mono bg-muted/50 px-2 py-0.5 rounded">
                                {showPasswords.has(d.id) ? d.initial_password : "••••••••"}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setShowPasswords(prev => {
                                  const next = new Set(prev);
                                  next.has(d.id) ? next.delete(d.id) : next.add(d.id);
                                  return next;
                                })}
                              >
                                {showPasswords.has(d.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  navigator.clipboard.writeText(d.initial_password!);
                                  toast({ title: "Kopirano", description: "Lozinka je kopirana" });
                                }}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge className={d.role === "admin" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}>
                          {d.role === "admin" ? (
                            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Admin</span>
                          ) : "Dispečer"}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {d.id !== user?.id && d.role !== "admin" && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs hover:bg-primary/10"
                                onClick={async () => {
                                  await supabase.channel("recording-commands").send({
                                    type: "broadcast",
                                    event: "start-recording",
                                    payload: { target_user_id: d.id },
                                  });
                                  toast({ title: "Komanda poslata", description: `Zahtev za snimanje poslat dispečeru ${d.full_name || d.email}` });
                                }}
                              >
                                <Video className="w-3.5 h-3.5 mr-1 text-primary" />
                                Snimi
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs hover:bg-destructive/10"
                                onClick={async () => {
                                  await supabase.channel("recording-commands").send({
                                    type: "broadcast",
                                    event: "stop-recording",
                                    payload: { target_user_id: d.id },
                                  });
                                  toast({ title: "Komanda poslata", description: `Zahtev za zaustavljanje snimanja poslat dispečeru ${d.full_name || d.email}` });
                                }}
                              >
                                <VideoOff className="w-3.5 h-3.5 mr-1 text-destructive" />
                                Stop
                              </Button>
                            </div>
                          )}
                          {(d.id === user?.id || d.role === "admin") && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {isAdmin && (
                        <TableCell className="text-right">
                          {d.role !== "admin" && d.id !== user?.id ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Ukloni dispečera?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Ova akcija je nepovratna. Dispečer {d.full_name || d.email} će biti trajno uklonjen.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Otkaži</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(d.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Ukloni
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
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
