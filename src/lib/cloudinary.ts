import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const FOLDER = process.env.CLOUDINARY_FOLDER || "portfolio";

const POSITION_STEP = 100;

export type MediaItem = {
  publicId: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: string;
  resourceType: "image" | "video";
  createdAt: string;
  bytes: number;
  duration?: number;
  position: number | null;
};

type CloudinaryResource = {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: "image" | "video";
  created_at: string;
  bytes: number;
  duration?: number;
  context?: {
    custom?: Record<string, string>;
  } & Record<string, unknown>;
};

const buildThumbnailUrl = (resource: CloudinaryResource): string => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (resource.resource_type === "video") {
    return `https://res.cloudinary.com/${cloudName}/video/upload/c_fill,h_900,w_700,q_auto,f_auto,so_0/${resource.public_id}.jpg`;
  }
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,h_900,w_700,q_auto,f_auto/${resource.public_id}.${resource.format}`;
};

const readPosition = (resource: CloudinaryResource): number | null => {
  const raw =
    resource.context?.custom?.position ??
    (resource.context as Record<string, unknown> | undefined)?.position;
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const toMediaItem = (resource: CloudinaryResource): MediaItem => ({
  publicId: resource.public_id,
  url: resource.secure_url,
  thumbnailUrl: buildThumbnailUrl(resource),
  width: resource.width,
  height: resource.height,
  format: resource.format,
  resourceType: resource.resource_type,
  createdAt: resource.created_at,
  bytes: resource.bytes,
  duration: resource.duration,
  position: readPosition(resource),
});

const sortMedia = (items: MediaItem[]): MediaItem[] => {
  const positioned = items.filter((i) => i.position !== null);
  const unpositioned = items.filter((i) => i.position === null);
  positioned.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  unpositioned.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return [...positioned, ...unpositioned];
};

export async function listMedia(): Promise<MediaItem[]> {
  const [images, videos] = await Promise.all([
    cloudinary.search
      .expression(`folder:${FOLDER} AND resource_type:image`)
      .with_field("context")
      .sort_by("created_at", "desc")
      .max_results(500)
      .execute()
      .catch(() => ({ resources: [] as CloudinaryResource[] })),
    cloudinary.search
      .expression(`folder:${FOLDER} AND resource_type:video`)
      .with_field("context")
      .sort_by("created_at", "desc")
      .max_results(500)
      .execute()
      .catch(() => ({ resources: [] as CloudinaryResource[] })),
  ]);

  const all: CloudinaryResource[] = [
    ...(images.resources as CloudinaryResource[]),
    ...(videos.resources as CloudinaryResource[]),
  ];

  return sortMedia(all.map(toMediaItem));
}

const computeNewItemPosition = async (): Promise<number> => {
  const items = await listMedia();
  const positioned = items
    .map((i) => i.position)
    .filter((p): p is number => p !== null);
  if (positioned.length === 0) return POSITION_STEP;
  const min = Math.min(...positioned);
  return min - POSITION_STEP;
};

export async function uploadMedia(
  file: Buffer,
  filename: string,
  resourceType: "image" | "video",
): Promise<MediaItem> {
  const position = await computeNewItemPosition();
  const result = await new Promise<CloudinaryResource>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: FOLDER,
        resource_type: resourceType,
        public_id: filename.replace(/\.[^/.]+$/, ""),
        overwrite: false,
        unique_filename: true,
        context: `position=${position}`,
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Upload failed"));
          return;
        }
        resolve(uploadResult as CloudinaryResource);
      },
    );
    stream.end(file);
  });

  return toMediaItem(result);
}

export async function deleteMedia(
  publicId: string,
  resourceType: "image" | "video",
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}

export type ReorderEntry = {
  publicId: string;
  resourceType: "image" | "video";
};

export async function reorderMedia(order: ReorderEntry[]): Promise<void> {
  await Promise.all(
    order.map((entry, index) =>
      cloudinary.uploader.explicit(entry.publicId, {
        type: "upload",
        resource_type: entry.resourceType,
        context: `position=${(index + 1) * POSITION_STEP}`,
      }),
    ),
  );
}

export default cloudinary;
