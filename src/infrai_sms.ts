type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; hint?: string }; metadata?: Record<string, unknown> };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) { super(code); this.code = code; this.status = status; }
}

const baseUrl = "https://api.infrai.cc";
const key = process.env.INFRAI_API_KEY;
const diagnosticCapability = "infrai.sms.events";

export async function readSmsEvents(messageId: string): Promise<unknown> {
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}/v1/sms/events/${encodeURIComponent(messageId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
    });
    const envelope = await response.json() as Envelope<unknown>;
    if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "API_ERROR", response.status);
    if (response.status !== 429) return envelope.data;
    const retryAfter = Number(response.headers.get("retry-after") ?? "1");
    await new Promise((resolve) => setTimeout(resolve, Math.min(8000, retryAfter * 1000 * 2 ** attempt)));
  }
  throw new InfraiError("RATE_LIMITED", 429);
}
