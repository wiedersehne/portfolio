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

  const measurements: { label: string; value: string; unit?: string }[] = [
    { label: "Height", value: "190", unit: "cm" },
    { label: "Bust", value: "106", unit: "cm" },
    { label: "Waist", value: "82", unit: "cm" },
    { label: "Size", value: "50", unit: "eu" },
    { label: "Shoes", value: "43", unit: "eu" },
    { label: "Eyes", value: "Brown" },
    { label: "Hair", value: "Brown" },
  ];

  return (
    <>
      <SiteHeader showAdminLink />

      <main className="flex-1">
        <section className="mx-auto max-w-[1600px] px-6 pt-12 pb-10 md:px-10 md:pt-20 md:pb-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-8">
              <p className="mb-6 text-[11px] uppercase tracking-editorial text-muted">
                Volume 01 — Editorial Portfolio
              </p>
              <h1 className="font-display text-7xl leading-[0.9] md:text-[9rem] lg:text-[11rem]">
                Dashuo
              </h1>
              <p className="mt-3 font-display text-2xl italic text-muted md:mt-4 md:text-3xl">
                — River
              </p>
            </div>
            <div className="flex flex-col justify-end md:col-span-4">
              <p className="max-w-md text-base leading-relaxed text-muted md:text-lg">
                A study in form, light and movement — a curated selection of
                editorial, runway, and campaign work.
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

        <section className="border-y border-border">
          <div className="mx-auto max-w-[1600px] px-6 md:px-10">
            <p className="border-b border-border py-3 text-[10px] uppercase tracking-editorial text-muted">
              Measurements
            </p>
            <dl className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0 md:grid-cols-7">
              {measurements.map((m) => (
                <div
                  key={m.label}
                  className="flex flex-col gap-1 px-4 py-6 md:py-8 first:border-l-0"
                >
                  <dt className="text-[10px] uppercase tracking-editorial text-muted">
                    {m.label}
                  </dt>
                  <dd className="flex items-baseline gap-1.5">
                    <span className="font-display text-3xl leading-none md:text-4xl">
                      {m.value}
                    </span>
                    {m.unit ? (
                      <span className="text-[10px] uppercase tracking-editorial text-muted">
                        {m.unit}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-[1600px] px-6 pt-12 pb-12 md:px-10 md:pt-16 md:pb-20">
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
