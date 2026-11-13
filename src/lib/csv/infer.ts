// CSV 컬럼 타입 추론 + 차트 제안
export type ColType = "number" | "date" | "category";
export type Column = { key: string; type: ColType };
export type ChartKind = "line" | "bar" | "scatter" | "area" | "pie";
export type ChartSpec = { kind: ChartKind; x: string; y: string[] };

type Row = Record<string, unknown>;

const isNum = (v: unknown) => v !== "" && v !== null && v !== undefined && Number.isFinite(Number(v));
const isDate = (v: unknown) => typeof v === "string" && /^\d{4}[-/.]\d{1,2}([-/.]\d{1,2})?/.test(v) && !Number.isNaN(Date.parse(v.replace(/[./]/g, "-")));

export function inferColumns(rows: Row[], sample = 200): Column[] {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  const head = rows.slice(0, sample);
  return keys.map((key) => {
    const vals = head.map((r) => r[key]).filter((v) => v !== "" && v != null);
    const ratio = (f: (v: unknown) => boolean) => (vals.length ? vals.filter(f).length / vals.length : 0);
    const type: ColType = ratio(isDate) > 0.9 ? "date" : ratio(isNum) > 0.9 ? "number" : "category";
    return { key, type };
  });
}

// 단조 증가 수치열 → 연속 x축
const monotonic = (rows: Row[], key: string) => {
  const v = rows.map((r) => Number(r[key]));
  return v.length > 2 && v.every((x, i) => i === 0 || x > v[i - 1]);
};

export function suggestChart(cols: Column[], rows: Row[] = []): ChartSpec | null {
  const nums = cols.filter((c) => c.type === "number");
  const date = cols.find((c) => c.type === "date");
  const cat = cols.find((c) => c.type === "category");
  if (!nums.length) return null;
  if (date) return { kind: "line", x: date.key, y: nums.slice(0, 4).map((c) => c.key) };
  if (cat) return { kind: "bar", x: cat.key, y: nums.slice(0, 3).map((c) => c.key) };
  if (nums.length >= 2 && monotonic(rows, nums[0].key)) return { kind: "line", x: nums[0].key, y: nums.slice(1, 5).map((c) => c.key) };
  if (nums.length >= 2) return { kind: "scatter", x: nums[0].key, y: [nums[1].key] };
  return { kind: "line", x: nums[0].key, y: [nums[0].key] };
}

// 숫자 캐스팅
export function coerce(rows: Row[], cols: Column[]): Row[] {
  const numeric = new Set(cols.filter((c) => c.type === "number").map((c) => c.key));
  return rows.map((r) => {
    const o: Row = { ...r };
    for (const k of numeric) o[k] = isNum(r[k]) ? Number(r[k]) : null;
    return o;
  });
}
