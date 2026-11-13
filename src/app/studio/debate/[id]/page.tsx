import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { DebateThread } from "@/components/studio/DebateThread";

export default async function Topic({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb, user, profile } = await getViewer();
  const { data: topic } = await sb.from("debate_topics").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!topic) notFound();

  const [{ data: comments }, { data: members }, { data: article }] = await Promise.all([
    sb.from("debate_comments").select("*").eq("topic_id", id).order("created_at"),
    sb.from("profiles").select("id, display_name, discipline").eq("is_member", true),
    topic.article_id ? sb.from("articles").select("id, title").eq("id", topic.article_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="stack" style={{ ["--gap" as string]: "24px", maxWidth: 920 }}>
      <Link href="/studio/debate" className="mono dim">← Arena</Link>
      <h1 className="studio-title" style={{ marginBottom: 0 }}>{topic.title}</h1>
      {topic.prompt && <p className="serif dim" style={{ fontSize: "1.1rem" }}>{topic.prompt}</p>}
      {article && <Link href={`/studio/articles/${article.id}?tab=read`} className="chip">↳ {article.title}</Link>}
      <DebateThread
        topicId={id}
        me={{ id: user!.id, discipline: profile!.discipline }}
        members={members ?? []}
        initial={comments ?? []}
      />
    </div>
  );
}
