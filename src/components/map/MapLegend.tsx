interface LegendItem {
  color: string;
  label: string;
}

const items: LegendItem[] = [
  { color: "#22c55e", label: "Slobodan" },
  { color: "#ef4444", label: "Zauzet" },
  { color: "#6b7280", label: "Offline" },
];

export default function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] map-legend">
      <div className="map-legend-title">Vozači</div>
      {items.map((item) => (
        <div key={item.label} className="map-legend-item">
          <div className="map-legend-dot" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}88` }} />
          <span className="font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
