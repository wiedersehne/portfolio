"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import type { MediaItem } from "@/lib/cloudinary";
import SortableMediaGrid from "./SortableMediaGrid";

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

  const uploadDirect = (
    file: File,
    index: number,
    apiKey: string,
    cloudName: string,
    folder: string,
    signature: string,
    timestamp: number,
    context: string,
  ) => {
    return new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      const resourceType = file.type.startsWith("video/") ? "video" : "image";
      xhr.open(
        "POST",
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      );

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
          setUploads((prev) =>
            prev.map((u, i) =>
              i === index ? { ...u, progress: 100, status: "done" } : u,
            ),
          );
          resolve(true);
          return;
        }
        let message = `Upload failed (${xhr.status}).`;
        try {
          const data = JSON.parse(xhr.responseText) as {
            error?: { message?: string };
          };
          if (data?.error?.message) message = data.error.message;
        } catch {
          // ignore
        }
        setUploads((prev) =>
          prev.map((u, i) =>
            i === index ? { ...u, status: "error", error: message } : u,
          ),
        );
        resolve(false);
      };

      xhr.onerror = () => {
        setUploads((prev) =>
          prev.map((u, i) =>
            i === index
              ? { ...u, status: "error", error: "Network error." }
              : u,
          ),
        );
        resolve(false);
      };

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", apiKey);
      form.append("timestamp", String(timestamp));
      form.append("signature", signature);
      form.append("folder", folder);
      form.append("context", context);
      xhr.send(form);
    });
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
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

      let signaturesPayload: {
        apiKey: string;
        cloudName: string;
        folder: string;
        signatures: { signature: string; timestamp: number; context: string }[];
      };
      try {
        const sigRes = await fetch("/api/upload-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: list.length }),
        });
        if (!sigRes.ok) {
          const data = (await sigRes.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data?.error ?? "Could not get upload signature.");
        }
        signaturesPayload = await sigRes.json();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Could not get upload signature.";
        setUploads((prev) =>
          prev.map((u, i) =>
            i >= startIndex && i < startIndex + list.length
              ? { ...u, status: "error", error: msg }
              : u,
          ),
        );
        setError(msg);
        return;
      }

      const { apiKey, cloudName, folder, signatures } = signaturesPayload;
      let anySuccess = false;
      for (let i = 0; i < list.length; i++) {
        const sig = signatures[i];
        if (!sig) continue;
        const ok = await uploadDirect(
          list[i],
          startIndex + i,
          apiKey,
          cloudName,
          folder,
          sig.signature,
          sig.timestamp,
          sig.context,
        );
        if (ok) anySuccess = true;
      }

      if (anySuccess) {
        router.refresh();
      }
    },
    [router, uploads.length],
  );

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

  const [savingOrder, setSavingOrder] = useState(false);
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistOrder = useCallback(async (next: MediaItem[]) => {
    setSavingOrder(true);
    try {
      const res = await fetch("/api/media/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: next.map((i) => ({
            publicId: i.publicId,
            resourceType: i.resourceType,
          })),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data?.error ?? "Failed to save order.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save order.");
    } finally {
      setSavingOrder(false);
    }
  }, []);

  const onReorder = useCallback(
    (next: MediaItem[]) => {
      setItems(next);
      if (reorderTimer.current) clearTimeout(reorderTimer.current);
      reorderTimer.current = setTimeout(() => {
        void persistOrder(next);
      }, 350);
    },
    [persistOrder],
  );

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
          <span className="flex items-center gap-3 text-[11px] uppercase tracking-editorial text-muted">
            {savingOrder ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
                Saving order
              </span>
            ) : null}
            <span>Drag to reorder · Hover to delete</span>
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
          <SortableMediaGrid
            items={items}
            busyIds={busyIds}
            onReorder={onReorder}
            onDelete={removeItem}
          />
        )}
      </section>
    </div>
  );
}
