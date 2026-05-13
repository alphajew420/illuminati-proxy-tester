"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Save, FolderOpen, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { useProxyTesterStore } from "@/store/proxy";
import { toast } from "sonner";
import { isTauri } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { Proxy, ProxyTesterOptions } from "@/types";

const RECENT_KEY = "proxy-tester:recent-sessions";
const MAX_RECENT = 8;

type SessionPayload = {
  version: 1;
  savedAt: string;
  options: ProxyTesterOptions;
  loadedProxies: Proxy[];
  testedProxies: Proxy[];
};

type RecentEntry = {
  name: string;
  savedAt: string;
  payload: SessionPayload;
};

function loadRecents(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecent(name: string, payload: SessionPayload) {
  if (typeof window === "undefined") return;
  const list = loadRecents();
  const next = [
    { name, savedAt: payload.savedAt, payload },
    ...list.filter((e) => e.name !== name),
  ].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function dropRecent(name: string) {
  if (typeof window === "undefined") return;
  const list = loadRecents().filter((e) => e.name !== name);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

export default function SessionsDropdown() {
  const {
    options,
    loadedProxies,
    testedProxies,
    replaceAllProxies,
    setOptions,
    clearAll,
  } = useProxyTesterStore();
  const [open_, setOpen] = useState(false);
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open_) setRecents(loadRecents());
  }, [open_]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const buildPayload = (): SessionPayload => ({
    version: 1,
    savedAt: new Date().toISOString(),
    options,
    loadedProxies,
    testedProxies,
  });

  const applyPayload = (p: SessionPayload) => {
    setOptions(p.options);
    // store doesn't expose a way to set testedProxies directly, but for
    // load purposes we replace loaded proxies and let "Run test" rerun.
    replaceAllProxies(p.loadedProxies);
    if (p.testedProxies.length) {
      // hack: trigger one-by-one to populate the testedProxies array.
      useProxyTesterStore.setState({ testedProxies: p.testedProxies });
    }
  };

  const handleSave = async () => {
    const payload = buildPayload();
    const json = JSON.stringify(payload, null, 2);
    const fileName = `session-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.proxytester`;
    try {
      if (isTauri()) {
        const path = await save({
          defaultPath: fileName,
          filters: [{ name: "Proxy tester", extensions: ["proxytester"] }],
        });
        if (!path) return;
        await writeTextFile(path, json);
        pushRecent(path.split("/").pop() || fileName, payload);
        toast.success("Session saved");
      } else {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        pushRecent(fileName, payload);
        toast.success("Session downloaded");
      }
      setRecents(loadRecents());
    } catch (err) {
      console.error(err);
      toast.error("Save failed");
    }
  };

  const handleLoad = async () => {
    try {
      let json: string | null = null;
      if (isTauri()) {
        const path = await open({
          multiple: false,
          filters: [{ name: "Proxy tester", extensions: ["proxytester"] }],
        });
        if (!path || Array.isArray(path)) return;
        json = await readTextFile(path);
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".proxytester,.json";
        await new Promise<void>((resolve) => {
          input.onchange = async () => {
            const file = input.files?.[0];
            if (file) json = await file.text();
            resolve();
          };
          input.click();
        });
      }
      if (!json) return;
      const payload = JSON.parse(json) as SessionPayload;
      if (!payload.version) throw new Error("invalid format");
      applyPayload(payload);
      toast.success("Session loaded");
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Load failed");
    }
  };

  const loadFromRecent = (entry: RecentEntry) => {
    applyPayload(entry.payload);
    toast.success(`Loaded ${entry.name}`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="transparent"
        size="lg"
        onClick={() => setOpen(!open_)}
        className={open_ ? "relative z-50" : ""}
      >
        <FolderOpen size={18} className="text-text-secondary" />
        <span className="text-sm font-medium">Sessions</span>
      </Button>

      <AnimatePresence>
        {open_ && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 z-50 mt-2 w-[360px] rounded-2xl border border-white/20 bg-[rgba(20,20,30,0.95)] backdrop-blur-3xl p-4"
          >
            <h3 className="text-sm font-semibold text-white mb-2">Sessions</h3>
            <div className="flex gap-2 mb-3">
              <Button onClick={handleSave} size="sm" className="flex-1">
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
              <Button
                onClick={handleLoad}
                size="sm"
                variant="ghost"
                className="flex-1"
              >
                <FolderOpen className="w-4 h-4 mr-1" /> Load
              </Button>
              <Button
                onClick={() => {
                  clearAll();
                  toast.message("Workspace cleared");
                }}
                size="sm"
                variant="ghost"
                className="text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs uppercase tracking-wide text-text-secondary mb-1">
              Recent
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {recents.length === 0 && (
                <p className="text-xs text-text-secondary py-3 text-center">
                  No recent sessions
                </p>
              )}
              {recents.map((r) => (
                <div
                  key={r.name}
                  className="group flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-white/5"
                >
                  <button
                    onClick={() => loadFromRecent(r)}
                    className="flex-1 text-left"
                  >
                    <div className="text-xs font-mono text-white truncate">
                      {r.name}
                    </div>
                    <div className="text-[10px] text-text-secondary">
                      {new Date(r.savedAt).toLocaleString()} ·{" "}
                      {r.payload.testedProxies.length}/
                      {r.payload.loadedProxies.length} tested
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      dropRecent(r.name);
                      setRecents(loadRecents());
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
