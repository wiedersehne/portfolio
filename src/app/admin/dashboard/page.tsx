import { redirect } from "next/navigation";
import AdminDashboard from "./AdminDashboard";
import SiteHeader from "@/components/SiteHeader";
import { isAuthenticated } from "@/lib/auth";
import { listMedia } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!(await isAuthenticated())) {
    redirect("/admin");
  }

  let items: Awaited<ReturnType<typeof listMedia>> = [];
  let error: string | null = null;

  try {
    items = await listMedia();
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "Could not load media from Cloudinary.";
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-10 md:px-10 md:py-16">
        <AdminDashboard initialItems={items} initialError={error} />
      </main>
    </>
  );
}
