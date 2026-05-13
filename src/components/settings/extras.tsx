"use client";

import { useProxyTesterStore } from "@/store/proxy";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  Globe2,
  Activity,
  Shield,
  Eye,
  Layers,
  Anchor,
  Gauge,
  ScanEye,
  RotateCcw,
  DollarSign,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dispatch, SetStateAction, useLayoutEffect, useRef } from "react";
import { ExtraTestOptions } from "@/types";

interface RowProps {
  icon: React.ElementType;
  label: string;
  tip: string;
  control: React.ReactNode;
}

function Row({ icon: Icon, label, tip, control }: RowProps) {
  return (
    <div className="flex items-center justify-between">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2.5">
            <Icon className="h-4 w-4 text-accent" />
            <Label className="text-sm cursor-help">{label}</Label>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="text-xs">{tip}</p>
        </TooltipContent>
      </Tooltip>
      {control}
    </div>
  );
}

export default function ExtrasSettings({
  setHeight,
}: {
  setHeight: Dispatch<SetStateAction<number>>;
}) {
  const { options, setOptions, isLoading } = useProxyTesterStore();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) setHeight(ref.current.offsetHeight);
  }, [setHeight, options.extras]);

  const extras = options.extras!;
  const setExtras = (patch: Partial<ExtraTestOptions>) =>
    setOptions({ extras: { ...extras, ...patch } });

  const numInput = (
    value: number,
    onChange: (v: number) => void,
    min: number,
    max: number,
    width = "w-20"
  ) => (
    <Input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || min)}
      disabled={isLoading}
      className={cn(
        `${width} h-8 text-center bg-white/5 border-white/20`,
        "focus:border-white/40 focus:bg-white/10",
        isLoading && "opacity-50"
      )}
    />
  );

  return (
    <div ref={ref} className="space-y-4">
      <Row
        icon={Globe2}
        label="Geo correctness"
        tip="Hit ipapi.co through each working proxy and record the actual exit country/city/ASN. Compares to a claimed country tag if you've set one."
        control={
          <Switch
            checked={extras.geoCorrectness}
            onCheckedChange={(c) => setExtras({ geoCorrectness: c })}
            disabled={isLoading}
          />
        }
      />

      <Row
        icon={Activity}
        label="Latency distribution"
        tip="Take N samples per proxy and report p50, p95 and jitter. Marks anything with p95 > 3× p50 as unstable."
        control={
          <div className="flex items-center gap-2">
            {extras.latencyDistribution &&
              numInput(
                extras.latencySamples,
                (v) => setExtras({ latencySamples: v }),
                2,
                25,
                "w-16"
              )}
            <Switch
              checked={extras.latencyDistribution}
              onCheckedChange={(c) => setExtras({ latencyDistribution: c })}
              disabled={isLoading}
            />
          </div>
        }
      />

      <Row
        icon={Layers}
        label="Protocol auto-detect"
        tip="Probe http/https/socks5/socks4 for the proxy and list which ones work."
        control={
          <Switch
            checked={extras.protocolAutoDetect}
            onCheckedChange={(c) => setExtras({ protocolAutoDetect: c })}
            disabled={isLoading}
          />
        }
      />

      <Row
        icon={Shield}
        label="Anonymity classification"
        tip="Hit a local probe endpoint and inspect leaked headers to classify each HTTP/HTTPS proxy as Elite / Anonymous / Transparent."
        control={
          <Switch
            checked={extras.anonymityClassification}
            onCheckedChange={(c) =>
              setExtras({ anonymityClassification: c })
            }
            disabled={isLoading}
          />
        }
      />

      <Row
        icon={Eye}
        label="DNS leak detection"
        tip="Make a request to a unique probe URL and confirm the source IP isn't the client's own IP."
        control={
          <Switch
            checked={extras.dnsLeakDetection}
            onCheckedChange={(c) => setExtras({ dnsLeakDetection: c })}
            disabled={isLoading}
          />
        }
      />

      <Row
        icon={Anchor}
        label="Session stickiness"
        tip="Fire 5 sequential requests with a 6s gap and check whether the exit IP stays the same."
        control={
          <Switch
            checked={extras.stickinessCheck}
            onCheckedChange={(c) => setExtras({ stickinessCheck: c })}
            disabled={isLoading}
          />
        }
      />

      <Row
        icon={Gauge}
        label="Concurrency cap"
        tip="Fire N parallel HEAD requests through the proxy and record how many succeed."
        control={
          <div className="flex items-center gap-2">
            {extras.concurrencyCheck &&
              numInput(
                extras.concurrencyAttempts,
                (v) => setExtras({ concurrencyAttempts: v }),
                5,
                200,
                "w-16"
              )}
            <Switch
              checked={extras.concurrencyCheck}
              onCheckedChange={(c) => setExtras({ concurrencyCheck: c })}
              disabled={isLoading}
            />
          </div>
        }
      />

      <Row
        icon={ScanEye}
        label="CAPTCHA detection"
        tip="Inspect the response body and flag Cloudflare / reCAPTCHA / hCaptcha challenge pages instead of plain blocks."
        control={
          <Switch
            checked={extras.captchaDetection}
            onCheckedChange={(c) => setExtras({ captchaDetection: c })}
            disabled={isLoading}
          />
        }
      />

      <Row
        icon={RotateCcw}
        label="Rotation tester"
        tip="If the proxy looks like a rotating endpoint, fire many sequential requests and count unique exit IPs."
        control={
          <Switch
            checked={extras.rotationCheck}
            onCheckedChange={(c) => setExtras({ rotationCheck: c })}
            disabled={isLoading}
          />
        }
      />

      <Row
        icon={DollarSign}
        label="Cost per GB ($)"
        tip="Tracks bytes transferred during probes and projects $ per 1k successful requests."
        control={
          <Input
            type="number"
            min={0}
            step={0.1}
            value={extras.costPerGb}
            onChange={(e) =>
              setExtras({ costPerGb: parseFloat(e.target.value) || 0 })
            }
            disabled={isLoading}
            className="w-24 h-8 text-center bg-white/5 border-white/20"
          />
        }
      />

      <Row
        icon={Target}
        label="Test multiple targets"
        tip="Test each proxy against multiple target URLs and view as a grid."
        control={
          <Switch
            checked={extras.multiTargetEnabled}
            onCheckedChange={(c) => setExtras({ multiTargetEnabled: c })}
            disabled={isLoading}
          />
        }
      />

      {extras.multiTargetEnabled && (
        <div className="pl-6 -mt-2">
          <Label className="text-xs text-text-secondary">
            Target URLs (one per line)
          </Label>
          <textarea
            value={extras.multiTargets.join("\n")}
            onChange={(e) =>
              setExtras({
                multiTargets: e.target.value
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean),
              })
            }
            disabled={isLoading}
            rows={4}
            placeholder={"https://www.google.com\nhttps://www.cloudflare.com"}
            className="w-full mt-1 text-xs font-mono bg-white/5 border border-white/20 rounded-md p-2 focus:border-white/40 focus:bg-white/10 resize-none"
          />
        </div>
      )}
    </div>
  );
}
