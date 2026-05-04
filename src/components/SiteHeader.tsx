import Link from "next/link";

type SiteHeaderProps = {
  showAdminLink?: boolean;
};

export default function SiteHeader({ showAdminLink = false }: SiteHeaderProps) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-6 md:px-10 md:py-8">
        <Link
          href="/"
          className="font-display text-2xl tracking-tight md:text-3xl"
          aria-label="Home"
        >
          Dashuo
        </Link>

        <nav className="flex items-center gap-6 text-[11px] uppercase tracking-editorial text-muted">
          <Link
            href="/"
            className="transition-colors hover:text-foreground"
          >
            Work
          </Link>
          {showAdminLink ? (
            <Link
              href="/admin"
              className="transition-colors hover:text-foreground"
            >
              Admin
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
