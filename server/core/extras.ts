/**
 * Extras module — implements the "12 new features" probes that run on top
 * of the base proxy test. These probes are all I/O bound; each takes the
 * already-validated proxy + the user options and returns a partial
 * ProxyExtras patch (plus byte counter).
 *
 * Design: kept intentionally separate from the low-level engine in
 * server/requests/proxy-tester.ts so we don't risk breaking the existing
 * single-proxy path. We use `got` + the existing createProxyAgent helper.
 */

import got from "got";
import {
  Proxy,
  ProxyExtras,
  ProxyProtocol,
  ExtraTestOptions,
  AnonymityLevel,
  LatencyDistribution,
  TargetResult,
  TargetVerdict,
} from "@/types";
import createProxyAgent from "../utils/createProxyAgent";

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

const FAST_TIMEOUT = 8_000;
const PROBE_HOST = "127.0.0.1";
const PROBE_PORT = 3001; // same Node server
const PROBE_BASE = `http://${PROBE_HOST}:${PROBE_PORT}`;

let probeServerExternalIp: string | null = null;
let probeServerExternalIpFetchedAt = 0;

async function getServerExternalIp(): Promise<string | null> {
  // Cached for 5 min.
  const now = Date.now();
  if (
    probeServerExternalIp &&
    now - probeServerExternalIpFetchedAt < 5 * 60_000
  ) {
    return probeServerExternalIp;
  }
  try {
    const r: any = await got("https://api.ipify.org?format=json", {
      timeout: { request: 4000 },
      retry: { limit: 0 },
    }).json();
    probeServerExternalIp = r?.ip || null;
    probeServerExternalIpFetchedAt = now;
    return probeServerExternalIp;
  } catch {
    return null;
  }
}

function tryAgent(proxy: Proxy, protocol: ProxyProtocol) {
  try {
    return createProxyAgent(proxy, protocol);
  } catch {
    return null;
  }
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((p / 100) * sorted.length))
  );
  return sorted[idx];
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function bytesFromResponse(resp: any): number {
  const body = resp?.body;
  if (body && typeof body === "string") return Buffer.byteLength(body);
  if (body && Buffer.isBuffer(body)) return body.length;
  const cl = resp?.headers?.["content-length"];
  if (cl) return Number(cl) || 0;
  return 0;
}

/* ------------------------------------------------------------------ */
/* Feature 1 — geographic correctness                                  */
/* ------------------------------------------------------------------ */

export async function probeGeo(
  proxy: Proxy,
  protocol: ProxyProtocol
): Promise<{ extras: NonNullable<ProxyExtras["geo"]>; bytes: number } | null> {
  const agent = tryAgent(proxy, protocol);
  if (!agent) return null;
  try {
    const resp: any = await got("https://ipapi.co/json/", {
      agent: { http: agent, https: agent },
      timeout: { request: FAST_TIMEOUT },
      retry: { limit: 0 },
      throwHttpErrors: false,
      responseType: "json",
    });
    const data = (resp.body || {}) as any;
    const bytes = bytesFromResponse(resp);
    const claim = proxy.claimedCountry?.toUpperCase()?.trim();
    const actualCc = (data.country_code || data.country || "")
      .toString()
      .toUpperCase();
    return {
      extras: {
        ip: data.ip,
        country: data.country_name || data.country,
        countryCode: actualCc || undefined,
        city: data.city,
        asn: data.asn,
        org: data.org,
        claimedCountry: claim,
        matchesClaim: claim ? claim === actualCc : null,
      },
      bytes,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Feature 2 — latency distribution                                    */
/* ------------------------------------------------------------------ */

export async function probeLatencyDistribution(
  proxy: Proxy,
  protocol: ProxyProtocol,
  targetUrl: string,
  samples: number
): Promise<{ extras: LatencyDistribution; bytes: number } | null> {
  const agent = tryAgent(proxy, protocol);
  if (!agent) return null;

  const collected: number[] = [];
  let bytes = 0;
  const n = Math.max(2, Math.min(samples || 5, 25));

  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    try {
      const resp: any = await got(targetUrl, {
        agent: { http: agent, https: agent },
        timeout: { request: FAST_TIMEOUT },
        retry: { limit: 0 },
        throwHttpErrors: false,
        method: "GET",
      });
      bytes += bytesFromResponse(resp);
      collected.push(Math.round(performance.now() - t0));
    } catch {
      // count failures as max timeout-ish to penalise but don't pollute
      collected.push(FAST_TIMEOUT);
    }
  }

  const sorted = [...collected].sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const sd = stddev(collected);
  return {
    extras: {
      samples: collected,
      p50,
      p95,
      mean: Math.round(mean),
      jitter: Math.round(sd),
      unstable: p50 > 0 ? p95 > p50 * 3 : false,
    },
    bytes,
  };
}

/* ------------------------------------------------------------------ */
/* Feature 3 — protocol auto-detection                                 */
/* ------------------------------------------------------------------ */

export async function probeProtocols(
  proxy: Proxy,
  targetUrl: string
): Promise<{ detected: ProxyProtocol[]; bytes: number }> {
  const order: ProxyProtocol[] = ["http", "https", "socks5", "socks4"];
  const detected: ProxyProtocol[] = [];
  let bytes = 0;
  await Promise.all(
    order.map(async (p) => {
      const agent = tryAgent(proxy, p);
      if (!agent) return;
      try {
        const resp: any = await got(targetUrl, {
          agent: { http: agent, https: agent },
          timeout: { request: 5_000 },
          retry: { limit: 0 },
          throwHttpErrors: false,
          method: "HEAD",
        });
        if (resp.statusCode && resp.statusCode < 500) {
          detected.push(p);
          bytes += bytesFromResponse(resp);
        }
      } catch {
        /* swallow */
      }
    })
  );
  return { detected, bytes };
}

/* ------------------------------------------------------------------ */
/* Feature 4 — anonymity classification                                */
/* ------------------------------------------------------------------ */

const LEAK_HEADERS = [
  "x-forwarded-for",
  "x-forwarded",
  "x-real-ip",
  "forwarded",
  "client-ip",
  "via",
  "proxy-connection",
  "x-proxy-id",
];

export async function probeAnonymity(
  proxy: Proxy,
  protocol: ProxyProtocol
): Promise<{
  extras: NonNullable<ProxyExtras["anonymity"]>;
  bytes: number;
} | null> {
  if (protocol !== "http" && protocol !== "https") return null;
  const agent = tryAgent(proxy, protocol);
  if (!agent) return null;

  const serverIp = await getServerExternalIp();

  try {
    const resp: any = await got(`${PROBE_BASE}/__anon-probe`, {
      agent: { http: agent, https: agent },
      timeout: { request: FAST_TIMEOUT },
      retry: { limit: 0 },
      throwHttpErrors: false,
      responseType: "json",
    });

    const data = (resp.body || {}) as any;
    const hdrs = (data.headers || {}) as Record<string, string>;
    const bytes = bytesFromResponse(resp);

    const leaked: string[] = [];
    let clientIpLeaked = false;
    for (const h of LEAK_HEADERS) {
      const v = hdrs[h];
      if (!v) continue;
      leaked.push(h);
      if (serverIp && v.includes(serverIp)) {
        clientIpLeaked = true;
      }
    }

    let level: AnonymityLevel;
    if (leaked.length === 0) level = "elite";
    else if (clientIpLeaked) level = "transparent";
    else level = "anonymous";

    return {
      extras: { level, leakedHeaders: leaked, clientIpLeaked },
      bytes,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Feature 5 — DNS leak                                                */
/* ------------------------------------------------------------------ */

export async function probeDnsLeak(
  proxy: Proxy,
  protocol: ProxyProtocol
): Promise<{ extras: NonNullable<ProxyExtras["dnsLeak"]>; bytes: number } | null> {
  if (protocol !== "http" && protocol !== "https") return null;
  const agent = tryAgent(proxy, protocol);
  if (!agent) return null;

  const token = Math.random().toString(36).slice(2, 12);
  const serverIp = await getServerExternalIp();
  try {
    // Force a fresh DNS lookup by embedding the token in the path; we don't
    // run a real DNS server so we rely on the request actually reaching the
    // probe + on the recorded source IP.
    const resp: any = await got(`${PROBE_BASE}/__dns-probe/${token}`, {
      agent: { http: agent, https: agent },
      timeout: { request: FAST_TIMEOUT },
      retry: { limit: 0 },
      throwHttpErrors: false,
      responseType: "json",
    });
    const data = (resp.body || {}) as any;
    const bytes = bytesFromResponse(resp);

    // proxy exit IP comes back from the same probe (the requester IP as seen
    // by the server is the proxy's exit IP for HTTP, or our client if
    // bypassed).
    const proxyIp = data.requesterIp as string | undefined;
    let detected = false;
    let reason: string | undefined;
    if (serverIp && proxyIp && proxyIp === serverIp) {
      detected = true;
      reason = "Request reached the probe with the client's own IP";
    }
    return {
      extras: { detected, resolverIp: proxyIp, proxyIp, reason },
      bytes,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Feature 6 — multi-target reachability                               */
/* ------------------------------------------------------------------ */

const CAPTCHA_SIGNATURES = [
  "cf-error",
  "cloudflare",
  "captcha",
  "just a moment",
  "attention required",
  "recaptcha",
  "hcaptcha",
  "px-captcha",
];

function classifyResponse(
  status: number | undefined,
  body: string
): TargetVerdict {
  const lower = (body || "").toLowerCase().slice(0, 4096);
  if (status === undefined) return "fail";
  const hasCaptcha = CAPTCHA_SIGNATURES.some((s) => lower.includes(s));
  if (hasCaptcha && (status === 200 || status === 403 || status === 429)) {
    return "captcha";
  }
  if (status >= 200 && status < 300) return "ok";
  if (status === 403 || status === 401 || status === 429 || status === 451)
    return "blocked";
  if (status >= 500) return "fail";
  return "blocked";
}

export async function probeMultiTarget(
  proxy: Proxy,
  protocol: ProxyProtocol,
  targets: string[],
  captchaDetection: boolean
): Promise<{ results: TargetResult[]; bytes: number }> {
  const agent = tryAgent(proxy, protocol);
  const results: TargetResult[] = [];
  let totalBytes = 0;
  if (!agent || targets.length === 0) return { results, bytes: 0 };

  await Promise.all(
    targets.map(async (target) => {
      const t0 = performance.now();
      try {
        const resp: any = await got(target, {
          agent: { http: agent, https: agent },
          timeout: { request: FAST_TIMEOUT },
          retry: { limit: 0 },
          throwHttpErrors: false,
          method: "GET",
        });
        const bytes = bytesFromResponse(resp);
        totalBytes += bytes;
        const verdict = captchaDetection
          ? classifyResponse(resp.statusCode, resp.body as string)
          : resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300
          ? "ok"
          : "blocked";
        results.push({
          target,
          verdict,
          statusCode: resp.statusCode,
          latency: Math.round(performance.now() - t0),
          bytes,
        });
      } catch (e: any) {
        const msg = (e?.message || "").toLowerCase();
        const verdict: TargetVerdict =
          msg.includes("timeout") || msg.includes("etimedout")
            ? "timeout"
            : "fail";
        results.push({
          target,
          verdict,
          latency: Math.round(performance.now() - t0),
          reason: e?.message,
        });
      }
    })
  );

  return { results, bytes: totalBytes };
}

/* ------------------------------------------------------------------ */
/* Feature 7 — session stickiness                                      */
/* ------------------------------------------------------------------ */

async function fetchExitIp(
  proxy: Proxy,
  protocol: ProxyProtocol
): Promise<{ ip: string | null; bytes: number }> {
  const agent = tryAgent(proxy, protocol);
  if (!agent) return { ip: null, bytes: 0 };
  try {
    const resp: any = await got("https://api.ipify.org?format=json", {
      agent: { http: agent, https: agent },
      timeout: { request: FAST_TIMEOUT },
      retry: { limit: 0 },
      throwHttpErrors: false,
      responseType: "json",
    });
    const bytes = bytesFromResponse(resp);
    const ip = ((resp.body || {}) as any).ip || null;
    return { ip, bytes };
  } catch {
    return { ip: null, bytes: 0 };
  }
}

export async function probeStickiness(
  proxy: Proxy,
  protocol: ProxyProtocol,
  samples: number,
  intervalMs: number
): Promise<{
  extras: NonNullable<ProxyExtras["stickiness"]>;
  bytes: number;
}> {
  const ips: string[] = [];
  let bytes = 0;
  const n = Math.max(2, Math.min(samples || 5, 10));
  for (let i = 0; i < n; i++) {
    const r = await fetchExitIp(proxy, protocol);
    if (r.ip) ips.push(r.ip);
    bytes += r.bytes;
    if (i < n - 1) await new Promise((res) => setTimeout(res, intervalMs));
  }
  const unique = new Set(ips).size;
  const verdict =
    ips.length === 0 ? "unknown" : unique === 1 ? "sticky" : "rotating";
  return {
    extras: { verdict, samples: ips, unique },
    bytes,
  };
}

/* ------------------------------------------------------------------ */
/* Feature 8 — concurrency ceiling                                     */
/* ------------------------------------------------------------------ */

export async function probeConcurrency(
  proxy: Proxy,
  protocol: ProxyProtocol,
  targetUrl: string,
  attempts: number
): Promise<{
  extras: NonNullable<ProxyExtras["concurrency"]>;
  bytes: number;
}> {
  const agent = tryAgent(proxy, protocol);
  const n = Math.max(2, Math.min(attempts || 50, 200));
  if (!agent) {
    return {
      extras: { attempted: n, succeeded: 0, ceiling: 0 },
      bytes: 0,
    };
  }
  let bytes = 0;
  let succeeded = 0;
  const promises: Promise<void>[] = [];
  for (let i = 0; i < n; i++) {
    promises.push(
      (async () => {
        try {
          const resp: any = await got(targetUrl, {
            agent: { http: agent, https: agent },
            timeout: { request: FAST_TIMEOUT },
            retry: { limit: 0 },
            throwHttpErrors: false,
            method: "HEAD",
          });
          bytes += bytesFromResponse(resp);
          if (
            resp.statusCode &&
            resp.statusCode < 500 &&
            resp.statusCode !== 429
          ) {
            succeeded++;
          }
        } catch {
          /* throttled / failed */
        }
      })()
    );
  }
  await Promise.all(promises);
  return {
    extras: { attempted: n, succeeded, ceiling: succeeded },
    bytes,
  };
}

/* ------------------------------------------------------------------ */
/* Bonus 2 — rotation tester                                           */
/* ------------------------------------------------------------------ */

export function detectsRotationHint(formatted: string): boolean {
  const lower = formatted.toLowerCase();
  return (
    lower.includes("?session=") ||
    lower.includes("-session-") ||
    lower.includes("_session_") ||
    lower.includes("session=") ||
    lower.includes("rotating") ||
    lower.includes("rotate")
  );
}

export async function probeRotation(
  proxy: Proxy,
  protocol: ProxyProtocol,
  attempts: number
): Promise<{ extras: NonNullable<ProxyExtras["rotation"]>; bytes: number }> {
  const n = Math.max(5, Math.min(attempts || 50, 100));
  const ips: string[] = [];
  let bytes = 0;
  for (let i = 0; i < n; i++) {
    const r = await fetchExitIp(proxy, protocol);
    if (r.ip) ips.push(r.ip);
    bytes += r.bytes;
  }
  const unique = new Set(ips).size;
  return {
    extras: {
      attempted: n,
      uniqueExits: unique,
      sampleIps: Array.from(new Set(ips)).slice(0, 20),
    },
    bytes,
  };
}

/* ------------------------------------------------------------------ */
/* Orchestrator                                                        */
/* ------------------------------------------------------------------ */

export async function runExtras(
  proxy: Proxy,
  workingProtocol: ProxyProtocol,
  targetUrl: string,
  opts: ExtraTestOptions
): Promise<{ extras: ProxyExtras; targets?: TargetResult[] }> {
  const extras: ProxyExtras = { bytesTransferred: 0 };
  const addBytes = (b: number) => {
    extras.bytesTransferred = (extras.bytesTransferred || 0) + b;
  };
  let targetResults: TargetResult[] | undefined;

  // Run all enabled probes — independent ones go in parallel; stickiness
  // and concurrency are heavier so we keep them sequential after.
  const parallelTasks: Promise<void>[] = [];

  if (opts.geoCorrectness) {
    parallelTasks.push(
      probeGeo(proxy, workingProtocol).then((r) => {
        if (r) {
          extras.geo = r.extras;
          addBytes(r.bytes);
        } else {
          extras.geo = null;
        }
      })
    );
  }

  if (opts.latencyDistribution) {
    parallelTasks.push(
      probeLatencyDistribution(
        proxy,
        workingProtocol,
        targetUrl,
        opts.latencySamples
      ).then((r) => {
        if (r) {
          extras.latency = r.extras;
          addBytes(r.bytes);
        } else {
          extras.latency = null;
        }
      })
    );
  }

  if (opts.protocolAutoDetect) {
    parallelTasks.push(
      probeProtocols(proxy, targetUrl).then((r) => {
        extras.detectedProtocols = r.detected;
        addBytes(r.bytes);
      })
    );
  }

  if (opts.anonymityClassification) {
    parallelTasks.push(
      probeAnonymity(proxy, workingProtocol).then((r) => {
        if (r) {
          extras.anonymity = r.extras;
          addBytes(r.bytes);
        } else {
          extras.anonymity = null;
        }
      })
    );
  }

  if (opts.dnsLeakDetection) {
    parallelTasks.push(
      probeDnsLeak(proxy, workingProtocol).then((r) => {
        if (r) {
          extras.dnsLeak = r.extras;
          addBytes(r.bytes);
        } else {
          extras.dnsLeak = null;
        }
      })
    );
  }

  if (opts.multiTargetEnabled && opts.multiTargets.length) {
    parallelTasks.push(
      probeMultiTarget(
        proxy,
        workingProtocol,
        opts.multiTargets,
        opts.captchaDetection
      ).then((r) => {
        targetResults = r.results;
        addBytes(r.bytes);
      })
    );
  }

  await Promise.all(parallelTasks);

  // Sequential heavy probes
  if (opts.stickinessCheck) {
    const r = await probeStickiness(
      proxy,
      workingProtocol,
      opts.stickinessSamples,
      opts.stickinessIntervalMs
    );
    extras.stickiness = r.extras;
    addBytes(r.bytes);
  }

  if (opts.concurrencyCheck) {
    const r = await probeConcurrency(
      proxy,
      workingProtocol,
      targetUrl,
      opts.concurrencyAttempts
    );
    extras.concurrency = r.extras;
    addBytes(r.bytes);
  }

  if (opts.rotationCheck || detectsRotationHint(proxy.formatted)) {
    const r = await probeRotation(
      proxy,
      workingProtocol,
      opts.rotationAttempts
    );
    extras.rotation = r.extras;
    addBytes(r.bytes);
  }

  return { extras, targets: targetResults };
}
