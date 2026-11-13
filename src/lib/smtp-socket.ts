import "server-only";

// Cloudflare Workers 용 SMTP 전송: cloudflare:sockets (465 암묵적 TLS · 587 STARTTLS)
// nodemailer 기본 SMTP 는 Workers 의 node:tls 제약(DNS 조회 · 소켓 옵션)에 걸려 실패 → 메일 본문 조립만 nodemailer, 전송은 여기서

type CfSocket = {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  opened: Promise<unknown>;
  close(): Promise<void>;
  startTls(): CfSocket;
};
type Connect = (addr: { hostname: string; port: number }, opts: { secureTransport: "on" | "off" | "starttls"; allowHalfOpen?: boolean }) => CfSocket;

export type SmtpOpts = { host: string; port: number; user: string; pass: string; secure?: "on" | "off" | "starttls"; timeoutMs?: number };

// Workers 런타임 여부
export const onWorkers = () => typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

class SmtpError extends Error {
  constructor(msg: string, public code: string, public responseCode?: number) {
    super(msg);
  }
}

const enc = new TextEncoder();
const dec = new TextDecoder();

// 줄 단위 응답 읽기 (여러 줄 응답: "250-..." … "250 ...")
function lineReader(sock: CfSocket) {
  const reader = sock.readable.getReader();
  let buf = "";
  const lines: string[] = [];
  return {
    async reply(): Promise<{ code: number; text: string }> {
      const got: string[] = [];
      for (;;) {
        while (lines.length) {
          const l = lines.shift()!;
          got.push(l);
          if (/^\d{3}(?: |$)/.test(l)) return { code: Number(l.slice(0, 3)), text: got.join("\n") };
        }
        const { value, done } = await reader.read();
        if (done) throw new SmtpError("connection closed", "ECONNECTION");
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\r\n");
        buf = parts.pop() ?? "";
        lines.push(...parts);
      }
    },
    release: () => reader.releaseLock(),
  };
}

// 본문: 줄 끝 CRLF 통일 · 점으로 시작하는 줄 이스케이프
const dotStuff = (raw: string) => raw.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");

export async function smtpSend(o: SmtpOpts, from: string, to: string[], raw: string): Promise<string> {
  // 빌드 도구가 풀지 않도록 문자열 변수로 (Workers 런타임 내장 모듈)
  const mod = "cloudflare:sockets";
  const { connect } = (await import(/* webpackIgnore: true */ mod)) as { connect: Connect };
  const secure = o.secure ?? (o.port === 465 ? "on" : "starttls");
  let sock = connect({ hostname: o.host, port: o.port }, { secureTransport: secure, allowHalfOpen: false });
  let io = lineReader(sock);
  let writer = sock.writable.getWriter();
  const timer = setTimeout(() => sock.close().catch(() => {}), o.timeoutMs ?? 20_000);

  const send = (s: string) => writer.write(enc.encode(s));
  const expect = async (ok: number[], stage: string) => {
    const r = await io.reply();
    if (!ok.includes(r.code)) throw new SmtpError(`${stage}: ${r.text}`, r.code === 535 || r.code === 534 ? "EAUTH" : "EPROTOCOL", r.code);
    return r;
  };
  const cmd = async (c: string, ok: number[], stage = c.split(" ")[0]) => {
    await send(c + "\r\n");
    return expect(ok, stage);
  };

  try {
    await expect([220], "greeting");
    await cmd("EHLO albireo", [250]);
    if (secure === "starttls") {
      await cmd("STARTTLS", [220]);
      writer.releaseLock();
      io.release();
      sock = sock.startTls();
      io = lineReader(sock);
      writer = sock.writable.getWriter();
      await cmd("EHLO albireo", [250]);
    }
    const plain = btoa(String.fromCharCode(...enc.encode(`\u0000${o.user}\u0000${o.pass}`)));
    await cmd(`AUTH PLAIN ${plain}`, [235], "AUTH");
    await cmd(`MAIL FROM:<${from}>`, [250]);
    for (const r of to) await cmd(`RCPT TO:<${r}>`, [250, 251]);
    await cmd("DATA", [354]);
    const body = dotStuff(raw);
    await send(body + (body.endsWith("\r\n") ? "" : "\r\n") + ".\r\n");
    const done = await expect([250], "DATA end");
    await send("QUIT\r\n").catch(() => {});
    return done.text;
  } finally {
    clearTimeout(timer);
    await sock.close().catch(() => {});
  }
}
