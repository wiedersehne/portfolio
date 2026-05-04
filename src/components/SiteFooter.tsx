export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-3 px-6 py-10 text-[11px] uppercase tracking-editorial text-muted md:flex-row md:items-center md:px-10">
        <p>© {year} Portfolio. All rights reserved.</p>
        <p>Editorial · Fashion · Modeling</p>
      </div>
    </footer>
  );
}
