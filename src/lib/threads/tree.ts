// 평면 댓글 → 트리
export type Node<T> = T & { children: Node<T>[]; depth: number };

export function buildTree<T extends { id: string; parent_id: string | null; created_at: string }>(rows: T[]): Node<T>[] {
  const map = new Map<string, Node<T>>();
  const roots: Node<T>[] = [];
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));

  for (const r of sorted) map.set(r.id, { ...r, children: [], depth: 0 });
  for (const n of map.values()) {
    const parent = n.parent_id ? map.get(n.parent_id) : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n); // 고아 → 루트
  }
  const setDepth = (ns: Node<T>[], d: number) => ns.forEach((n) => { n.depth = d; setDepth(n.children, d + 1); });
  setDepth(roots, 0);
  return roots;
}

export function countDescendants<T>(n: Node<T>): number {
  return n.children.reduce((s, c) => s + 1 + countDescendants(c), 0);
}
