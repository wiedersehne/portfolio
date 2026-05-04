"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MediaItem } from "@/lib/cloudinary";

type MediaGridProps = {
  items: MediaItem[];
};

export default function MediaGrid({ items }: MediaGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);
  const next = useCallback(
    () =>
      setActiveIndex((i) =>
        i === null ? null : (i + 1) % items.length,
      ),
    [items.length],
  );
  const prev = useCallback(
    () =>
      setActiveIndex((i) =>
        i === null ? null : (i - 1 + items.length) % items.length,
      ),
    [items.length],
  );

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [activeIndex, close, next, prev]);

  const active = useMemo(
    () => (activeIndex === null ? null : items[activeIndex]),
    [activeIndex, items],
  );

  if (items.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 border border-dashed border-border py-20 text-center">
        <p className="font-display text-2xl">No work yet</p>
        <p className="text-sm text-muted">
          Upload your first photo or video from the admin panel.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 md:gap-2 lg:grid-cols-4">
        {items.map((item, idx) => (
          <button
            key={item.publicId}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className="group relative aspect-[3/4] w-full cursor-zoom-in overflow-hidden bg-[#eeece5] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            aria-label={`Open media ${idx + 1}`}
          >
            <Image
              src={item.thumbnailUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-all duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-90"
            />
            {item.resourceType === "video" ? (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 bg-foreground/85 px-2 py-1 text-[9px] uppercase tracking-editorial text-background backdrop-blur-sm">
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 10 10"
                  fill="currentColor"
                >
                  <path d="M2 1 L9 5 L2 9 Z" />
                </svg>
                Video
              </span>
            ) : null}
            <span className="pointer-events-none absolute inset-0 flex items-end p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
              <span className="text-[10px] uppercase tracking-editorial text-background">
                {String(idx + 1).padStart(3, "0")}
              </span>
            </span>
          </button>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-up"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-6 top-6 z-10 inline-flex h-10 w-10 items-center justify-center text-foreground transition-opacity hover:opacity-60"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 4 L16 16 M16 4 L4 16" />
            </svg>
          </button>

          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-4 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center text-foreground transition-opacity hover:opacity-60 md:left-8"
                aria-label="Previous"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 4 L6 10 L12 16" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-4 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center text-foreground transition-opacity hover:opacity-60 md:right-8"
                aria-label="Next"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M8 4 L14 10 L8 16" />
                </svg>
              </button>
            </>
          ) : null}

          <div
            className="relative flex h-full w-full max-w-[1400px] items-center justify-center p-6 md:p-12"
            onClick={(e) => e.stopPropagation()}
          >
            {active.resourceType === "video" ? (
              <video
                key={active.publicId}
                src={active.url}
                controls
                autoPlay
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="relative flex h-full w-full items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={active.url}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-editorial text-muted">
            {String((activeIndex ?? 0) + 1).padStart(3, "0")} /{" "}
            {String(items.length).padStart(3, "0")}
          </div>
        </div>
      ) : null}
    </>
  );
}
