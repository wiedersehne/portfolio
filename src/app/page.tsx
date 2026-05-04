import MediaGrid from "@/components/MediaGrid";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { listMedia } from "@/lib/cloudinary";

export const revalidate = 30;

export default async function Home() {
  let items: Awaited<ReturnType<typeof listMedia>> = [];
  let error: string | null = null;

  try {
    items = await listMedia();
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "Could not connect to the media library.";
  }

  const photoCount = items.filter((i) => i.resourceType === "image").length;
  const videoCount = items.filter((i) => i.resourceType === "video").length;

  return (
    <>
      <SiteHeader showAdminLink />

      <main className="flex-1">
        <section className="mx-auto max-w-[1600px] px-6 pt-12 pb-10 md:px-10 md:pt-20 md:pb-16">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-8">
              <p className="mb-6 text-[11px] uppercase tracking-editorial text-muted">
                Volume 01 — Editorial Portfolio
              </p>
              <h1 className="font-display text-5xl leading-[0.95] md:text-7xl lg:text-8xl">
                A study in form,
                <br />
                light and movement.
              </h1>
            </div>
            <div className="flex flex-col justify-end md:col-span-4">
              <p className="max-w-md text-base leading-relaxed text-muted md:text-lg">
                A curated collection of editorial, runway, and campaign
                imagery — composed with intention, captured in moments.
              </p>
              <div className="mt-8 flex gap-8 text-[11px] uppercase tracking-editorial text-muted">
                <div>
                  <p className="text-foreground font-display text-2xl tracking-normal">
                    {String(photoCount).padStart(2, "0")}
                  </p>
                  <p className="mt-1">Photographs</p>
                </div>
                <div>
                  <p className="text-foreground font-display text-2xl tracking-normal">
                    {String(videoCount).padStart(2, "0")}
                  </p>
                  <p className="mt-1">Films</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1600px] px-6 pb-12 md:px-10 md:pb-20">
          <div className="mb-6 flex items-end justify-between border-t border-border pt-6">
            <h2 className="text-[11px] uppercase tracking-editorial text-muted">
              The Collection
            </h2>
            <span className="text-[11px] uppercase tracking-editorial text-muted">
              {String(items.length).padStart(3, "0")} works
            </span>
          </div>

          {error ? (
            <div className="border border-dashed border-border p-12 text-center">
              <p className="font-display text-2xl">Unable to load media</p>
              <p className="mt-2 text-sm text-muted">{error}</p>
              <p className="mt-4 text-xs text-muted">
                Make sure your Cloudinary credentials are set in{" "}
                <code className="font-mono">.env.local</code>.
              </p>
            </div>
          ) : (
            <MediaGrid items={items} />
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
