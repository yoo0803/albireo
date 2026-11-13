import type { Metadata } from "next";
import { CREDITS, GENERATED } from "@/content/credits";
import { Backdrop } from "@/components/art/Backdrop";
import { getLang } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Credits", alternates: { canonical: "/credits" } };

export default async function Credits() {
  const en = (await getLang()) === "en";
  return (
    <section className="section has-backdrop">
      <Backdrop seed="albireo-commons" tone="albireo" />
      <div className="wrap stack" style={{ ["--gap" as string]: "28px" }}>
        <div className="section-head"><h1 className="display" style={{ fontSize: "clamp(2.6rem, 7vw, 5rem)" }}>Credits</h1><span className="mono dim">Built by Yeji C.</span></div>
        <div className="table-scroll">
          <table className="table" style={{ minWidth: 680 }}>
            <thead><tr><th>{en ? "Project" : "프로젝트"}</th><th>{en ? "Author" : "제작"}</th><th>{en ? "License" : "라이선스"}</th><th>{en ? "Used for" : "용도"}</th></tr></thead>
            <tbody>
              {CREDITS.map((c) => (
                <tr key={c.name}>
                  <td><a href={c.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>{en && "nameEn" in c ? c.nameEn : c.name}</a></td>
                  <td className="dim">{en && "byEn" in c ? c.byEn : c.by}</td>
                  <td className="mono">{c.license}</td>
                  <td className="dim">{en ? c.useEn : c.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stack" style={{ ["--gap" as string]: "10px", marginTop: "clamp(36px, 6vw, 64px)" }}>
          <h2 className="label">{en ? "Generated with Claude Code" : "Claude Code로 만든 작업"}</h2>
          <div className="table-scroll">
            <table className="table" style={{ minWidth: 680 }}>
              <thead><tr><th>{en ? "Work" : "작업"}</th><th>{en ? "Prompting" : "프롬프트"}</th><th>{en ? "Tool" : "도구"}</th><th>{en ? "What it is" : "설명"}</th></tr></thead>
              <tbody>
                {GENERATED.map((g) => (
                  <tr key={g.name}>
                    <td>{en ? g.nameEn : g.name}<div className="mono faint" style={{ fontSize: "0.68rem" }}>{g.files}</div></td>
                    <td className="dim" style={{ whiteSpace: "nowrap" }}>Yeji C.</td>
                    <td className="mono">Claude Code (Anthropic)</td>
                    <td className="dim">{en ? g.useEn : g.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
