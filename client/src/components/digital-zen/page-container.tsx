import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function PageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-dz px-[clamp(1rem,4vw,1.5rem)]", className)}
      {...props}
    />
  );
}
