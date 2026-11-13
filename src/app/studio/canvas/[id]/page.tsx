import { notFound } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { Workbench } from "@/components/canvas/Workbench";

export default async function CanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb, profile } = await getViewer();
  const [{ data }, { data: articles }] = await Promise.all([
    sb.from("canvases").select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
    // 발췌 이미지를 넣을 원고 목록
    sb.from("articles").select("id, title").is("deleted_at", null).order("updated_at", { ascending: false }).limit(40),
  ]);
  if (!data) notFound();
  return <Workbench canvasId={data.id} initialTitle={data.title} initialDoc={data.doc} userId={profile!.id} articles={articles ?? []} locked={!!data.locked} isOwner={data.owner_id === profile!.id} />;
}
