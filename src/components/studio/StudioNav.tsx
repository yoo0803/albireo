"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/client";

const ITEMS = [
  { href: "/studio", label: ["개요", "Overview"], k: "01" },
  { href: "/studio/articles", label: ["원고", "Manuscripts"], k: "02" },
  { href: "/studio/series", label: ["연재", "Series"], k: "03" },
  { href: "/studio/debate", label: ["토론장", "Debate arena"], k: "04" },
  { href: "/studio/canvas", label: ["캔버스", "Canvas"], k: "05" },
  { href: "/studio/analytics", label: ["통계", "Analytics"], k: "06", admin: true },
  { href: "/studio/settings", label: ["설정", "Settings"], k: "07" },
  { href: "/studio/trash", label: ["휴지통", "Trash"], k: "08" },
];

export function StudioNav({ name, admin = false }: { name: string; admin?: boolean }) {
  const t = useT();
  const path = usePathname();
  const active = (href: string) => (href === "/studio" ? path === href : path.startsWith(href));
  return (
    <nav className="studio-nav" aria-label={t("작업실", "Studio")}>
      <div className="mono faint studio-nav-label" style={{ padding: "0 10px 12px" }}>{t("로그인", "Signed in")}: {name}</div>
      {ITEMS.filter((i) => admin || !("admin" in i)).map((i) => (
        <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}>
          <span>{t(i.label[0], i.label[1])}</span>
          <span className="mono faint studio-nav-label">{i.k}</span>
        </Link>
      ))}
    </nav>
  );
}
