import { cn } from "@/lib/utils";

export type UiSurface = "marketing" | "flow" | "app";

type PageSurfaceProps = {
  surface: UiSurface;
  /** Full-viewport shell (dashboard, onboarding, results, account). */
  fixed?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Sets `data-ui-surface` and page background from CSS variables in `globals.css`.
 * marketing = bright, editorial; flow = guided journey; app = dense tool UI.
 */
export function PageSurface({
  surface,
  fixed,
  className,
  children,
}: PageSurfaceProps) {
  return (
    <div
      data-ui-surface={surface}
      className={cn(
        fixed
          ? "fixed inset-0 flex flex-col overflow-hidden"
          : "min-h-screen flex flex-col",
        "bg-[var(--ui-page)] text-[var(--ui-fg)] antialiased",
        className,
      )}
    >
      {children}
    </div>
  );
}
