import { z } from "zod";

const coordinateSchema = z.object({
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
});

const upstreamSchema = z.object({
  display_name: z.string().optional(),
  address: z
    .object({
      city: z.string().optional(),
      town: z.string().optional(),
      village: z.string().optional(),
      state: z.string().optional(),
      region: z.string().optional(),
    })
    .optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = coordinateSchema.safeParse({
    latitude: url.searchParams.get("lat"),
    longitude: url.searchParams.get("lon"),
  });
  if (!parsed.success) return Response.json({ error: "坐标格式不正确。" }, { status: 400 });

  const { latitude, longitude } = parsed.data;
  const endpoint = new URL("https://nominatim.openstreetmap.org/reverse");
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("lat", String(latitude));
  endpoint.searchParams.set("lon", String(longitude));
  endpoint.searchParams.set("zoom", "18");
  endpoint.searchParams.set("addressdetails", "1");

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json", "User-Agent": "YlTt2025/1.0 location lookup" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return Response.json({ error: "地点解析服务暂时不可用。" }, { status: 502 });
    const payload = upstreamSchema.parse(await response.json());
    const address = payload.address ?? {};
    const city = address.city ?? address.town ?? address.village;
    const region = address.state ?? address.region;
    const label = payload.display_name;
    return Response.json({ label, city, region });
  } catch {
    return Response.json({ error: "地点解析失败，请手动填写。" }, { status: 502 });
  }
}
