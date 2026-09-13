import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-dz-glass-border bg-dz-glass/70 backdrop-blur-[20px] shadow-dz-ambient",
        className,
      )}
      {...props}
    />
  );
}
