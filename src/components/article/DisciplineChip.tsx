import { fieldLabel } from "@/content/fields";

export function DisciplineChip({ d }: { d: string }) {
  return <span className="chip chip-dot" data-d={d}>{fieldLabel(d)}</span>;
}
