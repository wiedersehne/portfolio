import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const FOLDER = process.env.CLOUDINARY_FOLDER || "portfolio";

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
};

const buildThumbnailUrl = (resource: CloudinaryResource): string => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (resource.resource_type === "video") {
    return `https://res.cloudinary.com/${cloudName}/video/upload/c_fill,h_900,w_700,q_auto,f_auto,so_0/${resource.public_id}.jpg`;
  }
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,h_900,w_700,q_auto,f_auto/${resource.public_id}.${resource.format}`;
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
});

export async function listMedia(): Promise<MediaItem[]> {
  const [images, videos] = await Promise.all([
    cloudinary.search
      .expression(`folder:${FOLDER} AND resource_type:image`)
      .sort_by("created_at", "desc")
      .max_results(500)
      .execute()
      .catch(() => ({ resources: [] as CloudinaryResource[] })),
    cloudinary.search
      .expression(`folder:${FOLDER} AND resource_type:video`)
      .sort_by("created_at", "desc")
      .max_results(500)
      .execute()
      .catch(() => ({ resources: [] as CloudinaryResource[] })),
  ]);

  const all: CloudinaryResource[] = [
    ...(images.resources as CloudinaryResource[]),
    ...(videos.resources as CloudinaryResource[]),
  ];

  return all
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .map(toMediaItem);
}

export async function uploadMedia(
  file: Buffer,
  filename: string,
  resourceType: "image" | "video",
): Promise<MediaItem> {
  const result = await new Promise<CloudinaryResource>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: FOLDER,
        resource_type: resourceType,
        public_id: filename.replace(/\.[^/.]+$/, ""),
        overwrite: false,
        unique_filename: true,
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

export default cloudinary;
