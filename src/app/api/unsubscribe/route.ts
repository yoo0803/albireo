import { unsubscribe } from "@/app/(site)/subscribe/actions";

// 메일 앱 원클릭 해지 (RFC 8058)
export async function POST(req: Request) {
  await unsubscribe(new URL(req.url).searchParams.get("t") ?? "");
  return new Response(null, { status: 204 });
}
