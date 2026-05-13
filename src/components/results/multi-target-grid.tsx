"use client";

import { useProxyTesterStore } from "@/store/proxy";
import { TargetVerdict } from "@/types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const verdictStyle: Record<TargetVerdict, string> = {
  ok: "bg-emerald-600/15 text-emerald-300 border-emerald-600/30",
  blocked: "bg-red-600/15 text-red-300 border-red-600/30",
  captcha: "bg-amber-600/15 text-amber-300 border-amber-600/30",
  fail: "bg-gray-600/15 text-gray-300 border-gray-600/30",
  timeout: "bg-slate-600/15 text-slate-300 border-slate-600/30",
};

const verdictLabel: Record<TargetVerdict, string> = {
  ok: "OK",
  blocked: "Blocked",
  captcha: "CAPTCHA",
  fail: "Fail",
  timeout: "Timeout",
};

export default function MultiTargetGrid() {
  const { testedProxies, options } = useProxyTesterStore();
  const targets = options.extras?.multiTargets || [];

  if (!options.extras?.multiTargetEnabled || targets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-8">
        <h3 className="text-lg font-medium text-white mb-2">
          Multi-target view
        </h3>
        <p className="text-sm text-text-secondary max-w-md">
          Enable &quot;Test multiple targets&quot; in Settings → Extras and add
          one or more target URLs to populate this grid.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[600px]">
      <table className="w-full text-sm">
        <thead className="bg-white/10 border-b border-white/20 sticky top-0 z-10">
          <tr>
            <th className="text-left px-3 py-2 font-medium min-w-[200px]">
              Proxy
            </th>
            {targets.map((t) => (
              <th
                key={t}
                className="text-left px-3 py-2 font-medium max-w-[180px]"
              >
                <span className="truncate block font-mono text-xs" title={t}>
                  {t.replace(/^https?:\/\//, "")}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {testedProxies.map((p) => {
            const byTarget = new Map(
              (p.targetResults || []).map((r) => [r.target, r])
            );
            return (
              <tr key={p.id} className="hover:bg-white/5">
                <td className="px-3 py-2 font-mono text-xs">
                  <span className="truncate block max-w-[200px]" title={p.raw}>
                    {p.formatted}
                  </span>
                </td>
                {targets.map((t) => {
                  const r = byTarget.get(t);
                  if (!r) {
                    return (
                      <td key={t} className="px-3 py-2">
                        <span className="text-xs text-text-secondary">-</span>
                      </td>
                    );
                  }
                  return (
                    <td key={t} className="px-3 py-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border cursor-help",
                              verdictStyle[r.verdict]
                            )}
                          >
                            {verdictLabel[r.verdict]}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold">{r.target}</p>
                          {r.statusCode && (
                            <p className="text-xs">HTTP {r.statusCode}</p>
                          )}
                          {r.latency !== undefined && (
                            <p className="text-xs">
                              Latency: {r.latency}ms
                            </p>
                          )}
                          {r.verdict === "captcha" && (
                            <p className="text-xs italic">
                              Exit IP is CAPTCHA-flagged
                            </p>
                          )}
                          {r.reason && (
                            <p className="text-xs text-text-secondary">
                              {r.reason}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
