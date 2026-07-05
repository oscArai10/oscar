import { cn } from "@/lib/utils/cn";
import Link from "next/link";

interface CardProps {
  title?: string;
  viewAllHref?: string;
  className?: string;
  children: React.ReactNode;
}

export function Card({ title, viewAllHref, className, children }: CardProps) {
  return (
    <div className={cn("glass-card rounded-2xl p-5", className)}>
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-accent-cyan-blue">
            {title}
          </h2>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs font-medium text-accent-blue-glow hover:text-accent-cyan"
            >
              View All
            </Link>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
