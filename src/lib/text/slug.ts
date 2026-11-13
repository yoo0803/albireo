// URL 슬러그 (한글 허용)
export function slugify(s: string): string {
  return (
    s.toLowerCase().normalize("NFC").replace(/[^a-z0-9가-힣\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80) ||
    `post-${Date.now().toString(36)}`
  );
}
