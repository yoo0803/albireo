import { fieldLabel } from "@/content/fields";

export function DisciplineChip({ d, ko = false }: { d: string; ko?: boolean }) {
  return <span className="chip chip-dot" data-d={d}>{fieldLabel(d, ko)}</span>;
}
