import { Fragment, type ReactNode } from "react";
import { footnoteOrder, parseInline, type Block, type Inline } from "@/lib/text/markdown";
import type { Reference } from "@/lib/cite/apa";
import type { Sentence } from "@/lib/text/sentences";
import { CsvChart } from "@/components/canvas/CsvChart";
import { DiagramView } from "./DiagramView";
import { parseChartBlock, parseDiagram } from "@/lib/text/blocks";

type Props = {
  blocks: Block[];
  annotated?: Set<string>; // 주석 존재 문장 id
  references?: Reference[]; // APA 7 정렬 완료
};

type FnMap = Map<string, number>;

export function renderInline(nodes: Inline[], fn?: FnMap): ReactNode {
  return nodes.map((n, i) => {
    switch (n.t) {
      case "strong": return <strong key={i}>{n.v}</strong>;
      case "em": return <em key={i}>{n.v}</em>;
      case "code": return <code key={i}>{n.v}</code>;
      case "u": return <u key={i}>{n.v}</u>;
      case "s": return <s key={i}>{n.v}</s>;
      case "mark": return <mark key={i}>{n.v}</mark>;
      case "link": return <a key={i} href={n.href} rel="noopener noreferrer" target={n.href.startsWith("http") ? "_blank" : undefined}>{n.v}</a>;
      case "wiki": return <span key={i} className="wikilink" data-term={n.term} title={n.term}>{n.label}</span>;
      case "fnref": {
        const no = fn?.get(n.id);
        return no ? <sup key={i} className="fnref"><a href={`#fn-${no}`} id={`fnref-${no}`} aria-label={`Footnote ${no}`}>{no}</a></sup> : <Fragment key={i}>[^{n.id}]</Fragment>;
      }
      default: return <Fragment key={i}>{n.v}</Fragment>;
    }
  });
}

// 문장 단위 span: 주석 앵커
function Sentences({ list, annotated, fn }: { list: Sentence[]; annotated?: Set<string>; fn: FnMap }) {
  return list.map((s, i) => (
    <Fragment key={s.id}>
      <span className="sentence" data-sid={s.id} data-has-ann={annotated?.has(s.id) || undefined}>
        {renderInline(parseInline(s.raw), fn)}
      </span>
      {i < list.length - 1 ? " " : null}
    </Fragment>
  ));
}

export function ArticleBody({ blocks, annotated, references }: Props) {
  let fig = 0;
  const notes = footnoteOrder(blocks);
  const fn: FnMap = new Map(notes.map((x) => [x.id, x.n]));
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading": {
            const H = `h${b.level}` as "h2" | "h3" | "h4";
            return <H key={i} id={b.anchor}>{renderInline(parseInline(b.text), fn)}</H>;
          }
          case "paragraph":
            return <p key={i}><Sentences list={b.sentences} annotated={annotated} fn={fn} /></p>;
          case "indent":
            return <p key={i} className="indent"><Sentences list={b.sentences} annotated={annotated} fn={fn} /></p>;
          case "table":
            return (
              <div key={i} className="table-wrap">
                <table className="prose-table">
                  <thead><tr>{b.head.map((h, k) => <th key={k} style={{ textAlign: b.align[k] }}>{renderInline(parseInline(h), fn)}</th>)}</tr></thead>
                  <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k} style={{ textAlign: b.align[k] }}>{renderInline(parseInline(c), fn)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            );
          case "quote":
            return <blockquote key={i}><Sentences list={b.sentences} annotated={annotated} fn={fn} /></blockquote>;
          case "list": {
            const L = b.ordered ? "ol" : "ul";
            return <L key={i}>{b.items.map((it, j) => <li key={j}><Sentences list={it} annotated={annotated} fn={fn} /></li>)}</L>;
          }
          case "code":
            if (b.lang === "chart") {
              const c = parseChartBlock(b.text);
              return (
                <figure key={i} className="figure">
                  <CsvChart csv={c.csv} kind={c.kind} height={280} paper />
                  <figcaption>Fig. {++fig}{c.title ? ` — ${c.title}` : ""}</figcaption>
                </figure>
              );
            }
            if (b.lang === "diagram") {
              const title = parseDiagram(b.text).title;
              return (
                <figure key={i} className="figure">
                  <DiagramView source={b.text} />
                  <figcaption>Fig. {++fig}{title ? ` — ${title}` : ""}</figcaption>
                </figure>
              );
            }
            return <pre key={i} data-lang={b.lang || undefined}><code>{b.text}</code></pre>;
          case "image":
            // eslint-disable-next-line @next/next/no-img-element
            return <figure key={i}><img src={b.src} alt={b.alt} loading="lazy" /><figcaption>{b.alt}</figcaption></figure>;
          case "hr":
            return <hr key={i} className="rule" />;
          case "footnote":
            return null;
        }
      })}

      {notes.length > 0 && (
        <section className="footnotes" aria-label="Notes">
          <h2>Notes</h2>
          <ol>
            {notes.map((x) => (
              <li key={x.id} id={`fn-${x.n}`}>
                {renderInline(parseInline(x.text), fn)} <a href={`#fnref-${x.n}`} className="fn-back" aria-label="Back to text">↩</a>
              </li>
            ))}
          </ol>
        </section>
      )}

      {references && references.length > 0 && (
        <section className="references" aria-label="References">
          <h2>References</h2>
          <ul>
            {references.map((r) => (
              <li key={r.doi}>
                {r.parts.map((p, j) => (p.i ? <i key={j}>{p.t}</i> : <Fragment key={j}>{p.t}</Fragment>))}
                <a href={r.url} rel="noopener noreferrer" target="_blank">{r.url}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
