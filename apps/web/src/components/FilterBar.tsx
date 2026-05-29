type FilterBarProps = {
  group: string;
  onGroupChange: (group: string) => void;
};

const GROUPS = [
  { label: "Active", value: "active" },
  { label: "ISS / Stations", value: "stations" },
  { label: "Weather", value: "weather" },
  { label: "GPS", value: "gps-ops" },
  { label: "Starlink", value: "starlink" },
  { label: "GEO", value: "geo" },
  { label: "Science", value: "science" }
];

export default function FilterBar({ group, onGroupChange }: FilterBarProps) {
  return (
    <div className="filter-bar">
      {GROUPS.map((item) => (
        <button
          key={item.value}
          className={group === item.value ? "active" : ""}
          onClick={() => onGroupChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}