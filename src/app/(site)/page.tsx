import { CanvasHome } from "@/components/canvas-home/CanvasHome";
import { listPublicArticles } from "@/lib/data/public";
import { getLang } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n";

export const revalidate = 300;

// 메인: 무한 캔버스
export default async function Home() {
  const [articles, lang] = await Promise.all([listPublicArticles({ limit: 24 }), getLang()]);
  return <CanvasHome articles={articles} lang={lang} t={translator(lang)} />;
}
