import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import SiteHeader from "@/components/SiteHeader";
import { isAuthenticated } from "@/lib/auth";

export default async function AdminLoginPage() {
  if (await isAuthenticated()) {
    redirect("/admin/dashboard");
  }

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="mb-3 text-[11px] uppercase tracking-editorial text-muted">
            Restricted Area
          </p>
          <h1 className="mb-8 font-display text-4xl">Admin Access</h1>
          <LoginForm />
        </div>
      </main>
    </>
  );
}
