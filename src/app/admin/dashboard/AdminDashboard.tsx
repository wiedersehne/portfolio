"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import type { MediaItem } from "@/lib/cloudinary";

type AdminDashboardProps = {
  initialItems: MediaItem[];
  initialError: string | null;
};

type UploadState = {
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

export default function AdminDashboard({
  initialItems,
  initialError,
}: AdminDashboardProps) {
  const router = useRouter();
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [error, setError] = useState<string | null>(initialError);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const setBusy = (id: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const uploadOne = (file: File, index: number) => {
    return new Promise<MediaItem | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/media");

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const progress = Math.round((e.loaded / e.total) * 100);
        setUploads((prev) =>
          prev.map((u, i) =>
            i === index ? { ...u, progress, status: "uploading" } : u,
          ),
        );
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as { item: MediaItem };
            setUploads((prev) =>
              prev.map((u, i) =>
                i === index ? { ...u, progress: 100, status: "done" } : u,
              ),
            );
            resolve(data.item);
            return;
          } catch {
            // fall through
          }
        }
        let message = "Upload failed.";
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string };
          if (data?.error) message = data.error;
        } catch {
          // ignore
        }
        setUploads((prev) =>
          prev.map((u, i) =>
            i === index ? { ...u, status: "error", error: message } : u,
          ),
        );
        resolve(null);
      };

      xhr.onerror = () => {
        setUploads((prev) =>
          prev.map((u, i) =>
            i === index
              ? { ...u, status: "error", error: "Network error." }
              : u,
          ),
        );
        resolve(null);
      };

      const form = new FormData();
      form.append("file", file);
      xhr.send(form);
    });
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    setError(null);
    const startIndex = uploads.length;
    setUploads((prev) => [
      ...prev,
      ...list.map<UploadState>((file) => ({
        file,
        progress: 0,
        status: "queued",
      })),
    ]);

    const newItems: MediaItem[] = [];
    for (let i = 0; i < list.length; i++) {
      const item = await uploadOne(list[i], startIndex + i);
      if (item) newItems.push(item);
    }

    if (newItems.length > 0) {
      setItems((prev) => [...newItems, ...prev]);
      router.refresh();
    }
  }, [router, uploads.length]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void handleFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeItem = async (item: MediaItem) => {
    if (
      !confirm(
        `Permanently delete this ${item.resourceType}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setBusy(item.publicId, true);
    try {
      const res = await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: item.publicId,
          resourceType: item.resourceType,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data?.error ?? "Failed to delete.");
      }
      setItems((prev) => prev.filter((i) => i.publicId !== item.publicId));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(item.publicId, false);
    }
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/admin");
    router.refresh();
  };

  const clearFinishedUploads = () => {
    setUploads((prev) => prev.filter((u) => u.status !== "done"));
  };

  const hasFinished = uploads.some((u) => u.status === "done");

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-3 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-editorial text-muted">
            Studio
          </p>
          <h1 className="font-display text-4xl md:text-5xl">Manage Portfolio</h1>
        </div>
        <div className="flex items-center gap-4 text-[11px] uppercase tracking-editorial">
          <span className="text-muted">
            {String(items.length).padStart(3, "0")} works
          </span>
          <button
            type="button"
            onClick={logout}
            className="border border-border px-4 py-2 transition-colors hover:border-foreground"
          >
            Sign out
          </button>
        </div>
      </header>

      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative border border-dashed transition-colors ${
          dragOver
            ? "border-foreground bg-foreground/5"
            : "border-border bg-transparent"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={onPick}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 px-6 py-16 text-center md:py-24"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-muted"
          >
            <path d="M16 22 V6 M10 12 L16 6 L22 12" />
            <path d="M4 22 V26 H28 V22" />
          </svg>
          <p className="font-display text-2xl">Drop files to upload</p>
          <p className="text-[11px] uppercase tracking-editorial text-muted">
            or click to browse · Images & video
          </p>
        </button>
      </section>

      {uploads.length > 0 ? (
        <section className="border border-border">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-[11px] uppercase tracking-editorial text-muted">
              Upload Queue
            </h2>
            {hasFinished ? (
              <button
                type="button"
                onClick={clearFinishedUploads}
                className="text-[11px] uppercase tracking-editorial text-muted transition-colors hover:text-foreground"
              >
                Clear completed
              </button>
            ) : null}
          </div>
          <ul className="divide-y divide-border">
            {uploads.map((u, i) => (
              <li
                key={`${u.file.name}-${i}`}
                className="flex flex-col gap-1 px-5 py-3 text-sm"
              >
                <div className="flex items-center gap-4">
                  <span className="flex-1 truncate font-mono text-xs text-muted">
                    {u.file.name}
                  </span>
                  <span className="hidden text-[10px] uppercase tracking-editorial text-muted sm:inline">
                    {(u.file.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  <span className="w-32 shrink-0">
                    <div className="h-px w-full bg-border">
                      <div
                        className={`h-full transition-all ${
                          u.status === "error"
                            ? "bg-red-700"
                            : u.status === "done"
                              ? "bg-foreground"
                              : "bg-foreground/60"
                        }`}
                        style={{
                          width: `${u.status === "error" ? 100 : u.progress}%`,
                        }}
                      />
                    </div>
                  </span>
                  <span className="w-16 shrink-0 text-right text-[10px] uppercase tracking-editorial">
                    {u.status === "done"
                      ? "Done"
                      : u.status === "error"
                        ? "Error"
                        : `${u.progress}%`}
                  </span>
                </div>
                {u.status === "error" && u.error ? (
                  <p className="pl-1 text-xs text-red-700">{u.error}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? (
        <div className="border border-red-700 bg-red-50 px-5 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section>
        <div className="mb-6 flex items-end justify-between border-t border-border pt-6">
          <h2 className="text-[11px] uppercase tracking-editorial text-muted">
            All Media
          </h2>
          <span className="text-[11px] uppercase tracking-editorial text-muted">
            Hover to delete
          </span>
        </div>

        {items.length === 0 ? (
          <div className="border border-dashed border-border px-6 py-20 text-center">
            <p className="font-display text-2xl">Nothing here yet</p>
            <p className="mt-2 text-sm text-muted">
              Upload your first photo or video using the area above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1 md:grid-cols-3 md:gap-2 lg:grid-cols-4">
            {items.map((item) => {
              const busy = busyIds.has(item.publicId);
              return (
                <div
                  key={item.publicId}
                  className="group relative aspect-[3/4] w-full overflow-hidden bg-[#eeece5]"
                >
                  <Image
                    src={item.thumbnailUrl}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                  />

                  {item.resourceType === "video" ? (
                    <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 bg-foreground/85 px-2 py-1 text-[9px] uppercase tracking-editorial text-background">
                      Video
                    </span>
                  ) : null}

                  <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="font-mono text-[10px] text-white/80 truncate max-w-[60%]">
                      {item.publicId.split("/").pop()}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeItem(item)}
                      className="border border-white/40 bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-editorial text-white backdrop-blur transition-colors hover:bg-red-700 hover:border-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
