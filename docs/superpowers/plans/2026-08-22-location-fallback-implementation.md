# Location Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin form fall back from browser GPS to Cloudflare-aware, city-level IP geolocation without ever storing IP-derived precise coordinates.

**Architecture:** Browser GPS and client fetch helpers remain in `features/media/client/location.ts`. A Next.js route extracts the visitor IP in Cloudflare/Vercel header order, asks an IP geolocation provider on the server, and returns only city and region. The form changes its visibility level based on the selected source.

**Tech Stack:** Next.js 16 App Router Route Handlers, React 19, TypeScript, Zod 4, Vitest.

---

## File Structure

- Create: `app/api/geocode/ip/route.ts` - Extract and use proxied client IP without logging or returning it.
- Create: `app/api/geocode/ip/route.test.ts` - Verify header precedence and upstream failures.
- Modify: `features/media/client/location.ts` - Typed GPS errors and city-level IP fetch helper.
- Modify: `features/media/client/location.test.ts` - Browser error and IP fallback tests.
- Create: `features/media/client/location-flow.ts` - Pure precise-to-IP fallback resolver.
- Create: `features/media/client/location-flow.test.ts` - Resolver behavior tests.
- Modify: `features/admin/components/content-form.tsx` - Apply resolver result and block duplicate clicks.

### Task 1: Add the Cloudflare-aware IP geolocation route

**Files:**
- Create: `app/api/geocode/ip/route.test.ts`
- Create: `app/api/geocode/ip/route.ts`

- [ ] **Step 1: Write the failing route tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { GET, getClientIp } from "./route";

describe("getClientIp", () => {
  it("prefers Cloudflare's IP", () => {
    expect(getClientIp(new Headers({ "cf-connecting-ip": "203.0.113.10", "x-forwarded-for": "198.51.100.4" }))).toBe("203.0.113.10");
  });
  it("uses x-forwarded-for then x-real-ip", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "198.51.100.4, 10.0.0.1" }))).toBe("198.51.100.4");
    expect(getClientIp(new Headers({ "x-real-ip": "192.0.2.1" }))).toBe("192.0.2.1");
  });
});

it("returns only city-level data", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, city: "Chengdu", region: "Sichuan" }))));
  const response = await GET(new Request("http://localhost/api/geocode/ip", { headers: { "cf-connecting-ip": "203.0.113.10" } }));
  expect(await response.json()).toEqual({ city: "Chengdu", region: "Sichuan" });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- app/api/geocode/ip/route.test.ts`

Expected: FAIL because `./route` does not exist.

- [ ] **Step 3: Implement the route**

```ts
import { isIP } from "node:net";
import { z } from "zod";

const upstreamSchema = z.object({ success: z.boolean().optional(), city: z.string().trim().min(1).optional(), region: z.string().trim().min(1).optional() });

export function getClientIp(headers: Headers): string | null {
  const candidates = [headers.get("cf-connecting-ip"), headers.get("x-forwarded-for")?.split(",")[0], headers.get("x-real-ip")];
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
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return Response.json({ error: "城市定位服务暂时不可用。" }, { status: 502 });
    const payload = upstreamSchema.parse(await response.json());
    if (payload.success === false || (!payload.city && !payload.region)) return Response.json({ error: "无法根据网络位置识别城市，请手动填写地点。" }, { status: 502 });
    return Response.json({ city: payload.city, region: payload.region });
  } catch {
    return Response.json({ error: "城市定位失败，请手动填写地点。" }, { status: 502 });
  }
}
```

Do not call an automatic-IP endpoint when headers are absent: it would resolve the Vercel or local server exit IP rather than the visitor.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test -- app/api/geocode/ip/route.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the route work**

Run: `git add app/api/geocode/ip/route.ts app/api/geocode/ip/route.test.ts; git commit -m "feat: add IP location fallback"`

Expected: one commit containing only the route and its test.

### Task 2: Classify browser-location errors and request IP fallback

**Files:**
- Modify: `features/media/client/location.test.ts`
- Modify: `features/media/client/location.ts`

- [ ] **Step 1: Add failing tests**

```ts
it("reports permission denial distinctly", async () => {
  const geolocation = { getCurrentPosition: vi.fn((_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1 } as GeolocationPositionError)) };
  await expect(getCurrentLocation(geolocation)).rejects.toMatchObject({ code: "permission-denied" });
});

it("returns city-level IP location", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ city: "成都", region: "四川省" }))));
  await expect(getIpLocation()).resolves.toEqual({ city: "成都", region: "四川省" });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- features/media/client/location.test.ts`

Expected: FAIL because `getIpLocation` and a typed error code do not exist.

- [ ] **Step 3: Implement the helpers**

```ts
export type LocationErrorCode = "unsupported" | "permission-denied" | "unavailable" | "timeout";
export class CurrentLocationError extends Error { constructor(public readonly code: LocationErrorCode) { super(code); } }

export function getCurrentLocation(geolocation: GeolocationLike | undefined = globalThis.navigator?.geolocation) {
  if (!geolocation) return Promise.reject(new CurrentLocationError("unsupported"));
  return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => reject(new CurrentLocationError(error.code === error.PERMISSION_DENIED ? "permission-denied" : error.code === error.TIMEOUT ? "timeout" : "unavailable")),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

export async function getIpLocation(): Promise<{ city?: string; region?: string } | null> {
  try {
    const response = await fetch("/api/geocode/ip", { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const payload = await response.json() as { city?: unknown; region?: unknown };
    const city = typeof payload.city === "string" && payload.city.length > 0 ? payload.city : undefined;
    const region = typeof payload.region === "string" && payload.region.length > 0 ? payload.region : undefined;
    return city || region ? { city, region } : null;
  } catch { return null; }
}
```

Also export `locationErrorMessage(error)` for exact Chinese messages for unsupported, denied, timed-out, and otherwise unavailable GPS.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test -- features/media/client/location.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the helper work**

Run: `git add features/media/client/location.ts features/media/client/location.test.ts; git commit -m "feat: classify location failures"`

Expected: one commit containing the helpers and their tests.

### Task 3: Resolve precise-to-IP fallback outside React and connect the form

**Files:**
- Create: `features/media/client/location-flow.test.ts`
- Create: `features/media/client/location-flow.ts`
- Modify: `features/admin/components/content-form.tsx`

- [ ] **Step 1: Write failing resolver tests**

```ts
it("prefers precise coordinates", async () => {
  await expect(resolveCurrentLocation({ getPrecise: async () => ({ latitude: 30, longitude: 104 }), getIp: async () => ({ city: "成都" }) })).resolves.toEqual({ source: "precise", latitude: 30, longitude: 104 });
});
it("uses IP city after GPS rejects", async () => {
  await expect(resolveCurrentLocation({ getPrecise: async () => Promise.reject(new CurrentLocationError("permission-denied")), getIp: async () => ({ city: "成都", region: "四川省" }) })).resolves.toEqual({ source: "ip", city: "成都", region: "四川省", preciseError: "permission-denied" });
});
it("returns the original error when both fail", async () => {
  await expect(resolveCurrentLocation({ getPrecise: async () => Promise.reject(new CurrentLocationError("timeout")), getIp: async () => null })).resolves.toEqual({ source: "none", preciseError: "timeout" });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- features/media/client/location-flow.test.ts`

Expected: FAIL because the resolver does not exist.

- [ ] **Step 3: Implement the pure resolver**

```ts
export async function resolveCurrentLocation(dependencies: LocationDependencies): Promise<LocationResolution> {
  try {
    return { source: "precise", ...(await dependencies.getPrecise()) };
  } catch (error) {
    const preciseError = error instanceof CurrentLocationError ? error.code : "unavailable";
    const ipLocation = await dependencies.getIp();
    return ipLocation ? { source: "ip", ...ipLocation, preciseError } : { source: "none", preciseError };
  }
}
```

Define `LocationDependencies` and a discriminated `LocationResolution` union in that file. It must not use DOM APIs or React state.

- [ ] **Step 4: Integrate the resolver in the form**

Add `isLocating` state. Replace the current `useCurrentLocation` body with `resolveCurrentLocation({ getPrecise: getCurrentLocation, getIp: getIpLocation })` inside `try/finally`. For `precise`, retain existing coordinate and reverse-geocoding behavior. For `ip`, set visibility to `"city"`, update city and region only, and clear latitude/longitude. For `none`, preserve all field values and show `locationErrorMessage` plus the manual-entry instruction. Disable and relabel the button while locating:

```tsx
<Button className="w-fit" disabled={isLocating} type="button" variant="outline" onClick={() => void useCurrentLocation()}>
  {isLocating ? "正在获取位置" : "一键获取地理位置"}
</Button>
```

Add `aria-live="polite"` to the existing location status alert. Do not alter the EXIF path or server-side form schema.

- [ ] **Step 5: Run focused tests and TypeScript checking**

Run: `npm test -- features/media/client/location-flow.test.ts && npm run typecheck`

Expected: tests pass and TypeScript exits 0.

- [ ] **Step 6: Commit the integration**

Run: `git add features/admin/components/content-form.tsx features/media/client/location-flow.ts features/media/client/location-flow.test.ts; git commit -m "feat: fall back to city IP location"`

Expected: one commit with the resolver, tests, and form integration.

### Task 4: Verify the completed behavior

**Files:**
- Review: `app/api/geocode/ip/route.ts`
- Review: `features/media/client/location.ts`
- Review: `features/admin/components/content-form.tsx`

- [ ] **Step 1: Run full automated checks**

Run: `npm test; npm run typecheck; npm run build; git diff --check`

Expected: all commands exit 0 and `git diff --check` has no output.

- [ ] **Step 2: Exercise the browser paths locally**

Run: `npm run dev`

Expected: granted permission fills exact coordinates; denied permission attempts city-level fallback; unavailable fallback preserves values and directs manual entry. Local development without forwarded headers is expected to fall back to manual entry.

- [ ] **Step 3: Commit verification-only corrections if needed**

Run: `git add app/api/geocode/ip features/media/client/location.ts features/media/client/location.test.ts features/media/client/location-flow.ts features/media/client/location-flow.test.ts features/admin/components/content-form.tsx; git commit -m "fix: verify location fallback"`

Expected: no commit is made unless verification uncovered a defect.

