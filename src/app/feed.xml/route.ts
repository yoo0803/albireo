import { listPublicArticles } from "@/lib/data/public";
import { SITE, absUrl } from "@/lib/seo";

export const dynamic = "force-dynamic"; // 요청마다 새로 (Cloudflare 정적 캐시는 읽기 전용)

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

// RSS 2.0
export async function GET() {
  const list = await listPublicArticles({ limit: 30 });
  const items = list.map((a) => `
    <item>
      <title>${esc(a.title)}</title>
      <link>${absUrl(`/articles/${a.slug}`)}</link>
      <guid isPermaLink="true">${absUrl(`/articles/${a.slug}`)}</guid>
      ${a.published_at ? `<pubDate>${new Date(a.published_at).toUTCString()}</pubDate>` : ""}
      <dc:creator>${esc(a.author.name)}</dc:creator>
      <category>${a.discipline}</category>
      ${a.excerpt ? `<description>${esc(a.excerpt)}</description>` : ""}
    </item>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${SITE.name}</title>
    <link>${absUrl("/")}</link>
    <description>${esc(SITE.description)}</description>
    <language>ko</language>${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
