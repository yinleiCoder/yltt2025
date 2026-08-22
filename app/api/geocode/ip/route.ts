import { isIP } from "node:net";

import { z } from "zod";

const upstreamSchema = z.object({
  success: z.boolean().optional(),
  city: z.string().trim().min(1).optional(),
  region: z.string().trim().min(1).optional(),
});

export function getClientIp(headers: Headers): string | null {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
    headers.get("x-real-ip"),
  ];

  for (const candidate of candidates) {
    const ip = candidate?.trim();
    if (ip && isIP(ip)) return ip;
  }

  return null;
}

export async function GET(request: Request) {
  const ip = getClientIp(request.headers);
  if (!ip) return Response.json({ error: "无法识别访问者 IP，请手动填写地点。" }, { status: 400 });

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return Response.json({ error: "城市定位服务暂时不可用。" }, { status: 502 });

    const payload = upstreamSchema.parse(await response.json());
    if (payload.success === false || (!payload.city && !payload.region)) {
      return Response.json({ error: "无法根据网络位置识别城市，请手动填写地点。" }, { status: 502 });
    }

    return Response.json({ city: payload.city, region: payload.region });
  } catch {
    return Response.json({ error: "城市定位失败，请手动填写地点。" }, { status: 502 });
  }
}
