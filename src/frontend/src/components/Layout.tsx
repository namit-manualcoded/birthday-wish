import { Heart } from "lucide-react";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  /** Optional owner-panel trigger rendered in the header. */
  headerAction?: ReactNode;
}

/**
 * Shared shell: a quiet translucent header, the main editorial scroll area,
 * and an attribution footer. Header and footer sit on distinct surfaces from
 * the content so the zones read clearly.
 */
export function Layout({ children, headerAction }: LayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <a
            href="#top"
            data-ocid="nav.home_link"
            className="flex items-center gap-2 rounded-full transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Heart
              className="h-4 w-4 fill-accent text-accent"
              aria-hidden="true"
            />
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">
              For You
            </span>
          </a>
          {headerAction}
        </div>
      </header>

      <main id="top" className="relative flex-1">
        {children}
      </main>

      <footer className="border-t border-border/60 bg-secondary/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-5 py-8 text-center sm:px-8">
          <p className="font-display text-sm italic text-muted-foreground">
            Made with love, for you.
          </p>
          <p
            data-ocid="footer.attribution_text"
            className="text-sm text-muted-foreground"
          >
            Coded by{" "}
            <strong className="font-semibold text-foreground">Namit</strong>
          </p>
        </div>
      </footer>
    </div>
  );
}
