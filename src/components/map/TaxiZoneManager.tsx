import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Plus, Trash2, Pencil, MapPin, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Crosshair } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TaxiZoneDB } from "@/hooks/useTaxiZones";

const COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#a855f7", "#f59e0b", "#06b6d4", "#ec4899", "#f97316"];
const NUDGE_STEP = 0.0002; // ~22m
const NUDGE_FINE = 0.00005; // ~5.5m

const emptyForm = { name: "", landmark: "", center_lat: "", center_lng: "", radius: "350", color: "#3b82f6" };

interface TaxiZoneManagerProps {
  zones: TaxiZoneDB[];
  onRefresh: () => void;
  pickMode: boolean;
  onPickModeChange: (active: boolean) => void;
  pickedCoords: { lat: number; lng: number } | null;
  onClearPicked: () => void;
}

export default function TaxiZoneManager({ zones, onRefresh, pickMode, onPickModeChange, pickedCoords, onClearPicked }: TaxiZoneManagerProps) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [fineMode, setFineMode] = useState(false);
  const { toast } = useToast();

  const step = fineMode ? NUDGE_FINE : NUDGE_STEP;

  // Apply picked coords from map click
  if (pickedCoords && formOpen) {
    setForm(prev => ({
      ...prev,
      center_lat: pickedCoords.lat.toFixed(6),
      center_lng: pickedCoords.lng.toFixed(6),
    }));
    onClearPicked();
  }

  const nudge = (axis: "lat" | "lng", delta: number) => {
    const key = axis === "lat" ? "center_lat" : "center_lng";
    setForm(prev => ({
      ...prev,
      [key]: (parseFloat(prev[key]) + delta).toFixed(6),
    }));
  };

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (z: TaxiZoneDB) => {
    setEditId(z.id);
    setForm({
      name: z.name,
      landmark: z.landmark,
      center_lat: z.center_lat.toFixed(6),
      center_lng: z.center_lng.toFixed(6),
      radius: String(z.radius),
      color: z.color,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      name: form.name,
      landmark: form.landmark,
      center_lat: parseFloat(form.center_lat),
      center_lng: parseFloat(form.center_lng),
      radius: parseInt(form.radius),
      color: form.color,
    };
    if (!payload.name || isNaN(payload.center_lat) || isNaN(payload.center_lng)) {
      toast({ title: "Popuni sva obavezna polja", variant: "destructive" });
      return;
    }

    if (editId) {
      const { error } = await supabase.from("taxi_zones").update(payload).eq("id", editId);
      if (error) { toast({ title: "Greška", description: error.message, variant: "destructive" }); return; }
      toast({ title: "✅ Zona ažurirana" });
    } else {
      const { error } = await supabase.from("taxi_zones").insert(payload);
      if (error) { toast({ title: "Greška", description: error.message, variant: "destructive" }); return; }
      toast({ title: "✅ Zona dodana" });
    }
    setFormOpen(false);
    onPickModeChange(false);
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from("taxi_zones").delete().eq("id", id);
    if (error) { toast({ title: "Greška", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Zona obrisana" });
    onRefresh();
  };

  const handleFormClose = (o: boolean) => {
    if (!o) {
      onPickModeChange(false);
    }
    setFormOpen(o);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 backdrop-blur-md border bg-background/70 text-foreground/70 border-border/40 hover:bg-background/90"
          title="Upravljaj zonama"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Uredi zone</span>
        </button>
      </DialogTrigger>
      <DialogContent className="z-[10000] max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Upravljanje taxi zonama</DialogTitle>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Boja</TableHead>
              <TableHead>Naziv</TableHead>
              <TableHead>Orijentir</TableHead>
              <TableHead>Lat / Lng</TableHead>
              <TableHead>Radius</TableHead>
              <TableHead className="text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zones.map((z) => (
              <TableRow key={z.id}>
                <TableCell>
                  <div className="w-5 h-5 rounded-full border border-border/50" style={{ backgroundColor: z.color }} />
                </TableCell>
                <TableCell className="font-semibold text-sm">{z.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{z.landmark}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {z.center_lat.toFixed(4)}, {z.center_lng.toFixed(4)}
                </TableCell>
                <TableCell className="text-sm">{z.radius}m</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(z)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(z.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {zones.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nema zona</TableCell></TableRow>
            )}
          </TableBody>
        </Table>

        <Button onClick={openAdd} className="w-full mt-2"><Plus className="w-4 h-4 mr-2" /> Dodaj zonu</Button>

        {/* Add/Edit sub-dialog */}
        <Dialog open={formOpen} onOpenChange={handleFormClose}>
          <DialogContent className="z-[10001] max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">{editId ? "Izmeni zonu" : "Nova zona"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Naziv *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Zona 5" /></div>
              <div><Label>Orijentir</Label><Input value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} placeholder="Naziv lokacije" /></div>

              {/* Coordinates with map pick + nudge */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Koordinate *</Label>
                  <Button
                    type="button"
                    variant={pickMode ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => onPickModeChange(!pickMode)}
                  >
                    <Crosshair className="w-3 h-3" />
                    {pickMode ? "Klikni na mapu..." : "Izaberi na mapi"}
                  </Button>
                </div>

                {pickMode && (
                  <div className="text-xs text-primary animate-pulse bg-primary/10 rounded-md px-3 py-2 text-center">
                    📍 Klikni na mapu da postaviš centar zone
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs text-muted-foreground">Latitude</Label><Input type="number" step="0.000001" value={form.center_lat} onChange={(e) => setForm({ ...form, center_lat: e.target.value })} placeholder="42.9981" className="font-mono text-xs" /></div>
                  <div><Label className="text-xs text-muted-foreground">Longitude</Label><Input type="number" step="0.000001" value={form.center_lng} onChange={(e) => setForm({ ...form, center_lng: e.target.value })} placeholder="21.9461" className="font-mono text-xs" /></div>
                </div>

                {/* Nudge controls */}
                {form.center_lat && form.center_lng && (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] text-muted-foreground mb-0.5">Pomeri</span>
                      <div className="grid grid-cols-3 gap-0.5">
                        <div />
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => nudge("lat", step)} title="Gore (sever)">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </Button>
                        <div />
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => nudge("lng", -step)} title="Levo (zapad)">
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        <div className="h-7 w-7 flex items-center justify-center">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => nudge("lng", step)} title="Desno (istok)">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                        <div />
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => nudge("lat", -step)} title="Dole (jug)">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </Button>
                        <div />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant={fineMode ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-[10px] gap-1"
                        onClick={() => setFineMode(!fineMode)}
                      >
                        {fineMode ? <ZoomIn className="w-3 h-3" /> : <ZoomOut className="w-3 h-3" />}
                        {fineMode ? "Fino (~5m)" : "Grubo (~22m)"}
                      </Button>
                      <span className="text-[10px] text-muted-foreground text-center">
                        Korak: {fineMode ? "~5.5m" : "~22m"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>Radius (m)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" value={form.radius} onChange={(e) => setForm({ ...form, radius: e.target.value })} className="flex-1" />
                  <div className="flex gap-1">
                    <Button type="button" variant="outline" size="sm" className="h-9 px-2" onClick={() => setForm(prev => ({ ...prev, radius: String(Math.max(50, parseInt(prev.radius) - 50)) }))}>-50</Button>
                    <Button type="button" variant="outline" size="sm" className="h-9 px-2" onClick={() => setForm(prev => ({ ...prev, radius: String(parseInt(prev.radius) + 50) }))}>+50</Button>
                  </div>
                </div>
              </div>

              <div>
                <Label>Boja</Label>
                <div className="flex gap-2 mt-1">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={handleSave}>{editId ? "Sačuvaj" : "Dodaj"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
