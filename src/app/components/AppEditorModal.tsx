"use client";
import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { CgWebsite } from "react-icons/cg";
import { FaCalendarAlt } from "react-icons/fa";
import { FaMagnifyingGlass, FaWebflow } from "react-icons/fa6";
import type { App } from "@/app/data/app-config";

type Props = {
  open: boolean;
  initial?: App | null;
  onClose: () => void;
  onSave: (app: App) => void;
};

const ICONS = [
  { id: "CgWebsite", icon: CgWebsite },
  { id: "FaCalendarAlt", icon: FaCalendarAlt },
  { id: "FaMagnifyingGlass", icon: FaMagnifyingGlass },
  { id: "FaWebflow", icon: FaWebflow },
];

export default function AppEditorModal({ open, initial, onClose, onSave }: Props) {
  const [nameKey, setNameKey] = useState("");
  const [url, setUrl] = useState("");
  const [roles, setRoles] = useState("");
  const [icon, setIcon] = useState(ICONS[0].id);
  const [iconInput, setIconInput] = useState(ICONS[0].id);
  const [previewIconComp, setPreviewIconComp] = useState<any>(null);
  const [iconSource, setIconSource] = useState<"preset" | "react" | "upload" | "favicon">("preset");
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [loadingFavicon, setLoadingFavicon] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [subChoices, setSubChoices] = useState<App["subChoices"]>([] as any);
  const [linkMode, setLinkMode] = useState<"url" | "subchoices">("url");

  useEffect(() => {
    if (!initial) {
      setNameKey("");
      setUrl("");
      setRoles("");
      setIcon(ICONS[0].id);
      setSubChoices([] as any);
      setLinkMode("url");
      setIconSource("preset");
      setUploadedDataUrl(null);
      setFaviconUrl(null);
      setPreviewIconComp(null);
      return;
    }
    setNameKey(initial.nameKey);
    setUrl(initial.url ?? "");
    setRoles((initial.roles || []).join(","));
    // try to infer icon by name if possible
    if (typeof initial.icon === "string") {
      // data URL or external favicon URL
      setIconSource(initial.icon.startsWith("data:") ? "upload" : "favicon");
      if (initial.icon.startsWith("data:")) setUploadedDataUrl(initial.icon as string);
      else setFaviconUrl(initial.icon as string);
      // set preset to first as fallback
      setIcon(ICONS[0].id);
      setIconInput(ICONS[0].id);
    } else {
      const initialIconName = (initial.icon as any)?.displayName || ICONS[0].id;
      setIcon(initialIconName);
      setIconInput(initialIconName);
      setIconSource("preset");
    }
    setSubChoices(initial.subChoices ?? [] as any);
    setLinkMode(initial.subChoices && initial.subChoices.length > 0 ? "subchoices" : "url");
  }, [initial, open]);

  if (!open) return null;

  const genId = (prefix = "app") => {
    try {
      // browser or node
      // @ts-ignore
      if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return `${prefix}:${(crypto as any).randomUUID()}`;
    } catch (e) {}
    return `${prefix}:${Math.random().toString(36).slice(2, 9)}`;
  };

  const handleSave = () => {
    const finalId = initial?.id ?? genId("app");
    // Resolve icon based on chosen source:
    // - upload: data URL string
    // - favicon: external URL (google s2)
    // - react: dynamically loaded component (previewIconComp)
    // - preset: selected preset component
    let resolvedIcon: any = null;
    if (iconSource === "upload") {
      resolvedIcon = uploadedDataUrl || ICONS.find((i) => i.id === icon)?.icon;
    } else if (iconSource === "favicon") {
      resolvedIcon = faviconUrl || ICONS.find((i) => i.id === icon)?.icon;
    } else if (iconSource === "react") {
      resolvedIcon = previewIconComp || ICONS.find((i) => i.id === icon)?.icon;
    } else {
      resolvedIcon = ICONS.find((i) => i.id === icon)?.icon;
    }
    const app: App = {
      id: finalId,
      nameKey: nameKey,
      // icon may be a component or a string (data URL / favicon URL)
      icon: resolvedIcon as any,
      url,
      roles: roles.split(",").map((r) => r.trim()).filter(Boolean),
      subChoices: subChoices?.map((sc: any) => ({ id: sc.id || genId("sc"), nameKey: sc.nameKey, url: sc.url, roles: sc.roles || [] })),
    };
    onSave(app);
    onClose();
  };

  const addSubChoice = () => {
    setSubChoices((s: any) => [...(s || []), { id: genId("sc"), nameKey: "", url: "", roles: [] }]);
  };

  // Dynamic icon loader: try import based on prefix (Fa, Cg, Md, Bi, Ri, Ai, Io, Gi, Fi, Si, Bs, Hi, Tb, Go)
  const ICON_LIB_MAP: Record<string, string> = {
    Fa: "react-icons/fa",
    Fa6: "react-icons/fa6",
    Cg: "react-icons/cg",
    Md: "react-icons/md",
    Bi: "react-icons/bi",
    Ri: "react-icons/ri",
    Ai: "react-icons/ai",
    Io: "react-icons/io",
    Io5: "react-icons/io5",
    Gi: "react-icons/gi",
    Fi: "react-icons/fi",
    Si: "react-icons/si",
    Bs: "react-icons/bs",
    Hi: "react-icons/hi",
    Tb: "react-icons/tb",
    Go: "react-icons/go",
  };

  const tryLoadIcon = async (name: string) => {
    if (!name) return null;
    // infer prefix (one or two letters could be prefix like Fa, Cg, Io5)
    const candidates = Object.keys(ICON_LIB_MAP).sort((a, b) => b.length - a.length);
    for (const prefix of candidates) {
      if (name.startsWith(prefix)) {
        try {
          // dynamic import module
          const mod = await import(/* webpackChunkName: "react-icons" */ ICON_LIB_MAP[prefix]);
          const comp = (mod as any)[name];
          if (comp) return comp;
        } catch (e) {
          // ignore and continue
        }
      }
    }
    return null;
  };

  const onLoadIconClick = async () => {
    setLoadError(null);
    setPreviewIconComp(null);
    const name = iconInput.trim();
    if (!name) return setLoadError("Empty icon name");
    const comp = await tryLoadIcon(name);
    if (comp) {
      setPreviewIconComp(() => comp);
      setIconSource("react");
    } else {
      setLoadError(`Icon not found: ${name}`);
      console.warn("Icon not found:", name);
    }
  };

  const handleFileChange = (file?: File) => {
    setLoadError(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string | ArrayBuffer | null;
      if (typeof res === "string") {
        setUploadedDataUrl(res);
        setIconSource("upload");
        setPreviewIconComp(null);
      }
    };
    reader.onerror = (e) => setLoadError("Failed to read file");
    reader.readAsDataURL(file);
  };

  const handleFaviconFetch = async () => {
    setLoadError(null);
    if (!url) return setLoadError("Set a URL first to fetch favicon");
    try {
      setLoadingFavicon(true);
      // Use Google s2 favicon service as a simple approach
      const candidate = `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;
      // Try to fetch and convert to data URL (best effort). If CORS blocks read/convert, fall back to keeping the external URL.
      try {
        const resp = await fetch(candidate, { mode: "cors" });
        if (!resp.ok) throw new Error("fetch-failed");
        const blob = await resp.blob();
        // Convert blob to data URL
        const reader = new FileReader();
        const dataUrl: Promise<string> = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("file-reader-failed"));
        });
        reader.readAsDataURL(blob);
        const result = await dataUrl;
        // if successful, use the data URL (inline) so there are no CORS issues later
        setUploadedDataUrl(result);
        setIconSource("upload");
      } catch (e) {
        // couldn't convert due to CORS or fetch error — fall back to external URL preview
        setFaviconUrl(candidate);
        setIconSource("favicon");
      }
    } catch (e) {
      setLoadError("Failed to fetch favicon");
    } finally {
      setLoadingFavicon(false);
    }
  };

  const updateSubChoice = (index: number, key: string, value: any) => {
    setSubChoices((s: any) => s.map((sc: any, i: number) => (i === index ? { ...sc, [key]: value } : sc)));
  };

  const removeSubChoice = (index: number) => {
    setSubChoices((s: any) => s.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-white text-xl">{initial ? "Edit App" : "Create App"}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-white/70 hover:text-white p-2 rounded">
            <FaTimes />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">

          <label className="text-white/70">Name key</label>
          <input value={nameKey} onChange={(e) => setNameKey(e.target.value)} className="bg-black/30 text-white px-3 py-2 rounded" />


          <label className="text-white/70">Roles (comma separated)</label>
          <input value={roles} onChange={(e) => setRoles(e.target.value)} className="bg-black/30 text-white px-3 py-2 rounded" />

          <div className="mt-2">
            <div className="flex items-center gap-4">
              <label className="text-white/70">Icon source:</label>
              <label className="text-white/60 flex items-center gap-2">
                <input type="radio" name="iconSource" checked={iconSource === "preset"} onChange={() => setIconSource("preset")} />
                <span>Preset</span>
              </label>
              <label className="text-white/60 flex items-center gap-2">
                <input type="radio" name="iconSource" checked={iconSource === "react"} onChange={() => setIconSource("react")} />
                <span>React-icon</span>
              </label>
              <label className="text-white/60 flex items-center gap-2">
                <input type="radio" name="iconSource" checked={iconSource === "upload"} onChange={() => setIconSource("upload")} />
                <span>Upload image</span>
              </label>
              <label className="text-white/60 flex items-center gap-2">
                <input type="radio" name="iconSource" checked={iconSource === "favicon"} onChange={() => setIconSource("favicon")} />
                <span>Site favicon</span>
              </label>
            </div>

            <div className="mt-3">
              {iconSource === "upload" && (
                <div className="flex items-center gap-2">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files?.[0])} />
                  {uploadedDataUrl && <span className="text-white/70 text-sm">Uploaded</span>}
                </div>
              )}

              {iconSource === "favicon" && (
                
                <div className="flex items-center gap-2">
                  {loadingFavicon && <span className="text-white/60">Loading…</span>}
                </div>
              )}

              {iconSource === "react" && (
                <div className="flex items-center gap-2">
                  <input placeholder="Type icon name e.g. FaCalendarAlt" value={iconInput} onChange={(e) => setIconInput(e.target.value)} className="bg-black/30 text-white px-3 py-2 rounded flex-1" />
                  <button onClick={onLoadIconClick} className="bg-gray-700 text-white px-3 py-2 rounded">Load</button>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center bg-black/20 rounded overflow-hidden">
                {iconSource === "upload" && uploadedDataUrl ? (
                  <img src={uploadedDataUrl} alt="uploaded" className="w-10 h-10 object-contain" />
                ) : iconSource === "favicon" && faviconUrl ? (
                  <img src={faviconUrl} alt="favicon" className="w-10 h-10 object-contain" />
                ) : (previewIconComp ? (
                  React.createElement(previewIconComp as any, { className: "w-6 h-6 text-white" })
                ) : (
                  (ICONS.find((i) => i.id === icon) && React.createElement(ICONS.find((i) => i.id === icon)!.icon as any, { className: "w-6 h-6 text-white" })) || <div className="text-white/50 text-xs">No icon</div>
                ))}
              </div>
              <div className="text-white/70 text-sm">
                {loadError ? <span className="text-red-400">{loadError}</span> : (
                  iconSource === "upload" ? <span>Using uploaded image</span> : iconSource === "favicon" ? <span>Using favicon for <strong className="text-white">{url || "(no url)"}</strong></span> : previewIconComp ? <span>Previewing <strong className="text-white">{iconInput}</strong></span> : <span>Using <strong className="text-white">{icon}</strong></span>
                )}
              </div>
            </div>
          </div>

            <div className="flex items-center gap-4">
                <label className="text-white/70 flex items-center gap-2">
                <input type="radio" name="linkMode" checked={linkMode === "url"} onChange={() => setLinkMode("url")} />
                <span>Use URL</span>
                </label>
                <label className="text-white/70 flex items-center gap-2">
                <input type="radio" name="linkMode" checked={linkMode === "subchoices"} onChange={() => setLinkMode("subchoices")} />
                <span>Use subChoices</span>
                </label>
            </div>

            {linkMode === "url" && (
                <>
                <label className="text-white/70">URL</label>
                <input value={url} onChange={(e) => setUrl(e.target.value)} className="bg-black/30 text-white px-3 py-2 rounded" />
                </>
            )}
        {linkMode === "subchoices" ? (
          <div className="pt-3">
            <div className="flex items-center justify-between">
              <label className="text-white/70">Sub choices</label>
              <div className="flex items-center gap-2">
                <button onClick={addSubChoice} className="text-white/80 bg-black/20 px-3 py-1 rounded">Add</button>
              </div>
            </div>
            <div className="mt-2">
              
                <div className="space-y-2 max-h-64 overflow-auto mt-2">
                  {subChoices && subChoices.length > 0 ? (
                    subChoices.map((sc: any, idx: number) => (
                      <div key={sc.id} className="bg-black/20 p-2 rounded">
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          {/* id is hidden/managed automatically */}
                          <input value={sc.nameKey} onChange={(e) => updateSubChoice(idx, "nameKey", e.target.value)} placeholder="nameKey" className="bg-black/10 text-white px-2 py-1 rounded flex-1" />
                          <input value={sc.url} onChange={(e) => updateSubChoice(idx, "url", e.target.value)} placeholder="url" className="bg-black/10 text-white px-2 py-1 rounded flex-1" />
                          <div className="flex items-center gap-2">
                            <button onClick={() => removeSubChoice(idx)} className="text-red-400 px-2">Remove</button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-white/60">No sub choices</div>
                  )}
                </div>
              
            </div>
          </div>
        ) : ( <></> )}

          <div className="flex items-center gap-3 justify-end pt-4">
            <button onClick={onClose} className="bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
