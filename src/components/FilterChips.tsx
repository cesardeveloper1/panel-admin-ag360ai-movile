interface FilterChip {
  id: string;
  label: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  value: string;
  onChange: (id: string) => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ chips, value, onChange }) => (
  <div className="filter-chips">
    {chips.map((chip) => (
      <button
        key={chip.id}
        type="button"
        className={`filter-chip${value === chip.id ? ' filter-chip--active' : ''}`}
        onClick={() => onChange(chip.id)}
      >
        {chip.label}
      </button>
    ))}
  </div>
);
