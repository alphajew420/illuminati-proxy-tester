"use client";

import { Proxy, ProxyTesterOptions } from "@/types";
import { TableCell } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import Flag from "../flag";
import { CheckCircle2, AlertTriangle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const anonStyle = {
  elite: "bg-emerald-600/10 text-emerald-300 border-emerald-600/20",
  anonymous: "bg-blue-600/10 text-blue-300 border-blue-600/20",
  transparent: "bg-red-600/10 text-red-300 border-red-600/20",
  unknown: "bg-gray-600/10 text-gray-300 border-gray-600/20",
};

const protocolBadgeColor: Record<string, string> = {
  http: "bg-blue-600/10 text-blue-300 border-blue-600/20",
  https: "bg-sky-600/10 text-sky-300 border-sky-600/20",
  socks4: "bg-purple-600/10 text-purple-300 border-purple-600/20",
  socks5: "bg-violet-600/10 text-violet-300 border-violet-600/20",
};

export default function ExtrasCells({
  proxy,
  options,
}: {
  proxy: Proxy;
  options: ProxyTesterOptions;
}) {
  const ex = options.extras;
  const data = proxy.extras;
  if (!ex) return null;

  return (
    <>
      {ex.geoCorrectness && (
        <TableCell>
          {data?.geo ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <Flag
                    countryCode={data.geo.countryCode || "XX"}
                    size={22}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs text-white">
                      {data.geo.country || "?"}
                    </span>
                    {data.geo.claimedCountry && (
                      <span
                        className={cn(
                          "text-[10px]",
                          data.geo.matchesClaim
                            ? "text-emerald-400"
                            : "text-red-400"
                        )}
                      >
                        {data.geo.matchesClaim ? "matches" : "MISMATCH"} (
                        {data.geo.claimedCountry})
                      </span>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Exit geolocation</p>
                <p className="text-xs mt-1">
                  {data.geo.city || "?"} · {data.geo.country || "?"}
                </p>
                {data.geo.asn && (
                  <p className="text-xs text-text-secondary">
                    {data.geo.asn} {data.geo.org}
                  </p>
                )}
                {data.geo.ip && (
                  <p className="text-xs font-mono mt-1">{data.geo.ip}</p>
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      )}

      {ex.latencyDistribution && (
        <TableCell>
          {data?.latency ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col cursor-help">
                  <span className="font-mono text-sm">
                    {data.latency.p50}ms
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-mono",
                      data.latency.unstable
                        ? "text-red-400"
                        : "text-text-secondary"
                    )}
                  >
                    p95 {data.latency.p95}ms{" "}
                    {data.latency.unstable && "· unstable"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="font-semibold">Latency distribution</p>
                <p className="text-xs">
                  p50: {data.latency.p50}ms · p95: {data.latency.p95}ms
                </p>
                <p className="text-xs">
                  Mean: {data.latency.mean}ms · jitter (σ):{" "}
                  {data.latency.jitter}ms
                </p>
                <p className="text-xs mt-1 font-mono">
                  samples: {data.latency.samples.join(", ")}ms
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      )}

      {ex.protocolAutoDetect && (
        <TableCell>
          {data?.detectedProtocols && data.detectedProtocols.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {data.detectedProtocols.map((p) => (
                <span
                  key={p}
                  className={cn(
                    "px-1.5 py-0.5 text-[10px] font-semibold rounded border",
                    protocolBadgeColor[p] ||
                      "bg-gray-600/10 text-gray-300 border-gray-600/20"
                  )}
                >
                  {p.toUpperCase()}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      )}

      {ex.anonymityClassification && (
        <TableCell>
          {data?.anonymity ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-md text-xs font-semibold border cursor-help",
                    anonStyle[data.anonymity.level]
                  )}
                >
                  <Shield size={12} />
                  <span className="capitalize">{data.anonymity.level}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold capitalize">
                  {data.anonymity.level}
                </p>
                {data.anonymity.leakedHeaders.length > 0 && (
                  <p className="text-xs mt-1">
                    Leaked: {data.anonymity.leakedHeaders.join(", ")}
                  </p>
                )}
                {data.anonymity.clientIpLeaked && (
                  <p className="text-xs text-red-400 mt-1">
                    Client IP visible to target
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      )}

      {ex.dnsLeakDetection && (
        <TableCell>
          {data?.dnsLeak ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-md text-xs font-semibold border cursor-help",
                    data.dnsLeak.detected
                      ? "bg-red-600/10 text-red-300 border-red-600/20"
                      : "bg-emerald-600/10 text-emerald-300 border-emerald-600/20"
                  )}
                >
                  {data.dnsLeak.detected ? (
                    <>
                      <AlertTriangle size={12} /> Leak
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={12} /> Clean
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">DNS / source IP probe</p>
                {data.dnsLeak.resolverIp && (
                  <p className="text-xs font-mono mt-1">
                    via {data.dnsLeak.resolverIp}
                  </p>
                )}
                {data.dnsLeak.reason && (
                  <p className="text-xs mt-1">{data.dnsLeak.reason}</p>
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      )}

      {ex.stickinessCheck && (
        <TableCell>
          {data?.stickiness ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center w-fit px-2 py-0.5 rounded-md text-xs font-semibold border cursor-help",
                    data.stickiness.verdict === "sticky"
                      ? "bg-emerald-600/10 text-emerald-300 border-emerald-600/20"
                      : data.stickiness.verdict === "rotating"
                      ? "bg-amber-600/10 text-amber-300 border-amber-600/20"
                      : "bg-gray-600/10 text-gray-300 border-gray-600/20"
                  )}
                >
                  {data.stickiness.verdict === "rotating"
                    ? `rotating · ${data.stickiness.unique}`
                    : data.stickiness.verdict}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Session stickiness</p>
                <p className="text-xs">
                  {data.stickiness.unique} unique exit IP
                  {data.stickiness.unique === 1 ? "" : "s"} across{" "}
                  {data.stickiness.samples.length} samples
                </p>
                <p className="text-xs font-mono mt-1 break-all">
                  {data.stickiness.samples.join(", ")}
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      )}

      {ex.concurrencyCheck && (
        <TableCell>
          {data?.concurrency ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-mono text-sm cursor-help">
                  {data.concurrency.succeeded}/{data.concurrency.attempted}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {data.concurrency.succeeded} of {data.concurrency.attempted}{" "}
                  parallel requests succeeded
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      )}

      {ex.rotationCheck && (
        <TableCell>
          {data?.rotation ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-mono text-sm cursor-help">
                  {data.rotation.uniqueExits}/{data.rotation.attempted}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  {data.rotation.uniqueExits} unique exits across{" "}
                  {data.rotation.attempted} attempts
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
      )}
    </>
  );
}
