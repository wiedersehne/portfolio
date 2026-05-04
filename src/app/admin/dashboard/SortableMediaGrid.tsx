"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { MediaItem } from "@/lib/cloudinary";

type SortableMediaGridProps = {
  items: MediaItem[];
  busyIds: Set<string>;
  onReorder: (newItems: MediaItem[]) => void;
  onDelete: (item: MediaItem) => void;
};

export default function SortableMediaGrid({
  items,
  busyIds,
  onReorder,
  onDelete,
}: SortableMediaGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = useMemo(() => items.map((i) => i.publicId), [items]);
  const activeItem = useMemo(
    () => (activeId ? items.find((i) => i.publicId === activeId) ?? null : null),
    [activeId, items],
  );

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-1 md:grid-cols-3 md:gap-2 lg:grid-cols-4">
          {items.map((item, index) => (
            <SortableTile
              key={item.publicId}
              item={item}
              index={index}
              busy={busyIds.has(item.publicId)}
              onDelete={onDelete}
              isDragging={activeId === item.publicId}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay adjustScale={false} dropAnimation={null}>
        {activeItem ? (
          <div className="aspect-[3/4] w-full overflow-hidden bg-[#eeece5] shadow-2xl ring-1 ring-foreground/30">
            <Image
              src={activeItem.thumbnailUrl}
              alt=""
              width={400}
              height={533}
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableTile({
  item,
  index,
  busy,
  isDragging,
  onDelete,
}: {
  item: MediaItem;
  index: number;
  busy: boolean;
  isDragging: boolean;
  onDelete: (item: MediaItem) => void;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging: dndIsDragging,
  } = useSortable({ id: item.publicId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || dndIsDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-[3/4] w-full overflow-hidden bg-[#eeece5] touch-none"
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        aria-label={`Drag to reorder ${item.publicId}`}
      >
        <Image
          src={item.thumbnailUrl}
          alt=""
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover pointer-events-none select-none"
          draggable={false}
        />
      </div>

      <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 bg-background/85 px-2 py-1 text-[9px] uppercase tracking-editorial text-foreground backdrop-blur-sm">
        {String(index + 1).padStart(2, "0")}
      </span>

      {item.resourceType === "video" ? (
        <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 bg-foreground/85 px-2 py-1 text-[9px] uppercase tracking-editorial text-background">
          Video
        </span>
      ) : null}

      <div className="pointer-events-none absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="font-mono text-[10px] text-white/80 truncate max-w-[55%]">
          {item.publicId.split("/").pop()}
        </span>
        <button
          type="button"
          disabled={busy}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
          className="pointer-events-auto border border-white/40 bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-editorial text-white backdrop-blur transition-colors hover:bg-red-700 hover:border-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
