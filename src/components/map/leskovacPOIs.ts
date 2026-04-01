// Key points of interest in Leskovac with real coordinates
export interface POI {
  name: string;
  icon: string;
  lat: number;
  lng: number;
  category: "transport" | "health" | "shopping" | "government" | "education" | "landmark";
}

export const LESKOVAC_POIS: POI[] = [
  // Transport
  { name: "Autobuska stanica", icon: "🚌", lat: 42.9983, lng: 21.9537, category: "transport" },
  { name: "Železnička stanica", icon: "🚂", lat: 43.0010, lng: 21.9530, category: "transport" },

  // Health
  { name: "Opšta bolnica", icon: "🏥", lat: 42.9945, lng: 21.9415, category: "health" },
  { name: "Dom zdravlja", icon: "⚕️", lat: 42.9975, lng: 21.9480, category: "health" },

  // Shopping
  { name: "TC Atrium", icon: "🛍️", lat: 42.9988, lng: 21.9458, category: "shopping" },
  { name: "Pijaca", icon: "🏪", lat: 42.9970, lng: 21.9500, category: "shopping" },

  // Government & Services
  { name: "Gradska kuća", icon: "🏛️", lat: 42.9982, lng: 21.9462, category: "government" },
  { name: "Policija", icon: "👮", lat: 42.9960, lng: 21.9440, category: "government" },
  { name: "Pošta", icon: "📮", lat: 42.9978, lng: 21.9475, category: "government" },

  // Education
  { name: "Tehnološki fakultet", icon: "🎓", lat: 43.0020, lng: 21.9390, category: "education" },

  // Landmarks
  { name: "Trg revolucije", icon: "⛲", lat: 42.9985, lng: 21.9465, category: "landmark" },
  { name: "Gradski park", icon: "🌳", lat: 42.9950, lng: 21.9380, category: "landmark" },
  { name: "Sportski centar", icon: "⚽", lat: 43.0015, lng: 21.9420, category: "landmark" },
];

export const POI_CATEGORIES: Record<string, { label: string; color: string }> = {
  transport: { label: "Saobraćaj", color: "#3b82f6" },
  health: { label: "Zdravstvo", color: "#ef4444" },
  shopping: { label: "Kupovina", color: "#a855f7" },
  government: { label: "Institucije", color: "#6b7280" },
  education: { label: "Obrazovanje", color: "#06b6d4" },
  landmark: { label: "Znamenitosti", color: "#22c55e" },
};
