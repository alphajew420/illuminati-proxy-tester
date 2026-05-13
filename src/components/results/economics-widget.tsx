"use client";

import { useMemo } from "react";
import { useProxyTesterStore } from "@/store/proxy";
import { DollarSign, HardDrive, Activity } from "lucide-react";

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(3)} GB`;
}

export default function EconomicsWidget() {
  const { testedProxies, options } = useProxyTesterStore();
  const cost = options.extras?.costPerGb || 0;

  const stats = useMemo(() => {
    let bytes = 0;
    let successes = 0;
    for (const p of testedProxies) {
      bytes += p.extras?.bytesTransferred || 0;
      if (p.status === "ok") successes++;
    }
    const gb = bytes / 1024 / 1024 / 1024;
    const totalCost = gb * cost;
    const costPer1k = successes > 0 ? (totalCost / successes) * 1000 : 0;
    return { bytes, successes, gb, totalCost, costPer1k };
  }, [testedProxies, cost]);

  if (testedProxies.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-accent" />
          <h4 className="text-sm font-semibold text-white">
            Provider economics
          </h4>
        </div>
        <span className="text-xs text-text-secondary">
          Set $/GB in Settings → Extras
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Stat
          icon={<HardDrive className="w-3.5 h-3.5" />}
          label="Total bytes"
          value={formatBytes(stats.bytes)}
        />
        <Stat
          icon={<Activity className="w-3.5 h-3.5" />}
          label="OK proxies"
          value={`${stats.successes}`}
        />
        <Stat
          icon={<DollarSign className="w-3.5 h-3.5" />}
          label="Total $ (at rate)"
          value={`$${stats.totalCost.toFixed(4)}`}
        />
        <Stat
          icon={<DollarSign className="w-3.5 h-3.5" />}
          label="$ per 1k success"
          value={cost > 0 ? `$${stats.costPer1k.toFixed(4)}` : "set rate"}
        />
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-1.5 text-text-secondary text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-mono text-base text-white">{value}</div>
    </div>
  );
}
