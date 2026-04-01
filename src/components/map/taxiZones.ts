// Taxi zones in Leskovac — each zone is a circle area around a key point
export interface TaxiZone {
  id: number;
  name: string;
  landmark: string;
  center: [number, number];
  radius: number; // meters
  color: string;
}

export const TAXI_ZONES: TaxiZone[] = [
  {
    id: 1,
    name: "Zona 1",
    landmark: "Legas / Autobuska stanica",
    center: [42.9983, 21.9537],
    radius: 350,
    color: "#3b82f6", // blue
  },
  {
    id: 2,
    name: "Zona 2",
    landmark: "Centar / Ivana Milutinovića",
    center: [42.9981, 21.9461],
    radius: 350,
    color: "#22c55e", // green
  },
  {
    id: 3,
    name: "Zona 3",
    landmark: "Bolnica",
    center: [42.9945, 21.9415],
    radius: 350,
    color: "#ef4444", // red
  },
  {
    id: 4,
    name: "Zona 4",
    landmark: "Radničko naselje",
    center: [43.0030, 21.9380],
    radius: 400,
    color: "#a855f7", // purple
  },
  {
    id: 6,
    name: "Zona 6",
    landmark: "Južnomoravskih brigada",
    center: [42.9920, 21.9530],
    radius: 380,
    color: "#f59e0b", // amber
  },
];
