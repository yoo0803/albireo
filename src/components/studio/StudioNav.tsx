"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/studio", label: "Overview", k: "01" },
  { href: "/studio/articles", label: "Manuscripts", k: "02" },
  { href: "/studio/series", label: "Series", k: "03" },
  { href: "/studio/debate", label: "Debate arena", k: "04" },
  { href: "/studio/canvas", label: "Canvas", k: "05" },
  { href: "/studio/analytics", label: "Analytics", k: "06", admin: true },
  { href: "/studio/settings", label: "Settings", k: "07" },
  { href: "/studio/trash", label: "Trash", k: "08" },
];

export function StudioNav({ name, admin = false }: { name: string; admin?: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/studio" ? path === href : path.startsWith(href));
  return (
    <nav className="studio-nav" aria-label="Studio">
      <div className="mono faint studio-nav-label" style={{ padding: "0 10px 12px" }}>Signed in · {name}</div>
      {ITEMS.filter((i) => admin || !("admin" in i)).map((i) => (
        <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}>
          <span>{i.label}</span>
          <span className="mono faint studio-nav-label">{i.k}</span>
        </Link>
      ))}
    </nav>
  );
}
