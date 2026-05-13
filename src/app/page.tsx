"use client";

import { useState } from "react";
import LoadProxiesDropdown from "@/components/load-proxies/dropdown";
import ModeToggleSwitch from "@/components/mode-toggle-switch";
import ProxyList from "@/components/results/table";
import ProxyToolbar from "@/components/results/toolbar";
import SettingsDropdown from "@/components/settings/dropdown";
import TargetUrlInput from "@/components/target-url-input";
import UpdateChecker from "@/components/updater/update-checker";
import MultiTargetGrid from "@/components/results/multi-target-grid";
import EconomicsWidget from "@/components/results/economics-widget";
import SessionsDropdown from "@/components/sessions/sessions-dropdown";
import { useGlobalPasteProxies } from "@/hooks/useGlobalPasteProxies";
import { useProxyTesterStore } from "@/store/proxy";

export default function Home() {
  useGlobalPasteProxies();
  const { options, testedProxies } = useProxyTesterStore();
  const [activeView, setActiveView] = useState<"results" | "grid">("results");
  const multiTargetEnabled =
    !!options.extras?.multiTargetEnabled &&
    (options.extras?.multiTargets?.length || 0) > 0;
  const hasBytesReport =
    (options.extras?.costPerGb ?? 0) > 0 ||
    testedProxies.some((p) => (p.extras?.bytesTransferred || 0) > 0);

  return (
    <div className="mt-6 flex w-full flex-col gap-6">
      <div className="flex w-full">
        <UpdateChecker />
      </div>
      <div className="w-full flex lg:items-center gap-6 items-start flex-col lg:flex-row justify-between">
        <div className="flex gap-2 w-1/2">
          <div className="w-64">
            <ModeToggleSwitch />
          </div>
          <TargetUrlInput />
        </div>

        <div className="flex items-center lg:justify-end gap-2 w-1/2 ">
          <LoadProxiesDropdown />
          <SessionsDropdown />
          <SettingsDropdown />
        </div>
      </div>

      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 shrink-0 px-5 py-4 ">
            <ProxyToolbar />
          </div>

          {multiTargetEnabled && (
            <div className="px-5 pt-3 flex gap-1 border-b border-white/10">
              <button
                onClick={() => setActiveView("results")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md ${
                  activeView === "results"
                    ? "bg-white/10 text-white"
                    : "text-text-secondary hover:text-white"
                }`}
              >
                Results
              </button>
              <button
                onClick={() => setActiveView("grid")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md ${
                  activeView === "grid"
                    ? "bg-white/10 text-white"
                    : "text-text-secondary hover:text-white"
                }`}
              >
                Multi-target grid
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden px-5 py-4 ">
            <div className="h-full overflow-y-auto">
              {activeView === "grid" && multiTargetEnabled ? (
                <MultiTargetGrid />
              ) : (
                <ProxyList />
              )}
            </div>
          </div>
        </div>

        {hasBytesReport ? <EconomicsWidget /> : null}
      </div>
    </div>
  );
}
