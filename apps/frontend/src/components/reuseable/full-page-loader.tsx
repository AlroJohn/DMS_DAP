"use client";

import CircularTextWithLoading from "@/components/react-bits/CircularTextWithLoading";
import { cn } from "@/lib/utils";

export function FullPageLoader({
  message = "Loading",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm",
        className,
      )}
    >
      <CircularTextWithLoading text={message} />
      <div className="mt-4 text-sm text-muted-foreground">{message}...</div>
    </div>
  );
}
