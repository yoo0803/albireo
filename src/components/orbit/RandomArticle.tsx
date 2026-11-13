"use client";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { Die } from "@/components/canvas-home/CanvasBar";

// 아무 글이나: 무작위 글로 이동 (글이 없으면 웹진)
export function RandomArticle({ slugs }: { slugs: string[] }) {
  const t = useT();
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn orbit-random"
      onClick={() => router.push(slugs.length ? `/articles/${slugs[Math.floor(Math.random() * slugs.length)]}` : "/articles")}
    >
      <Die /> {t("아무 글이나", "Random article")}
    </button>
  );
}
