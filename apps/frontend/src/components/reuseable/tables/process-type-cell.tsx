"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ProcessTypeCell({
  name,
  code,
  minClampLength = 10,
}: {
  name: string;
  code?: string;
  minClampLength?: number;
}) {
  const trimmedName = name?.trim() || "";
  const trimmedCode = code?.trim() || "";
  const displayLabel = trimmedCode || trimmedName || "N/A";
  const tooltipLabel = trimmedName || displayLabel;
  const shouldShowTooltip =
    Boolean(trimmedName) &&
    (tooltipLabel !== displayLabel || tooltipLabel.length >= minClampLength);

  const label = (
    <span
      className="text-xs text-muted-foreground truncate"
      title={shouldShowTooltip ? undefined : tooltipLabel}
    >
      {displayLabel}
    </span>
  );

  if (!shouldShowTooltip) {
    return <span className="inline-flex max-w-32">{label}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex max-w-32">{label}</span>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="max-w-48 text-[10px] leading-snug break-words whitespace-normal"
      >
        {tooltipLabel}
      </TooltipContent>
    </Tooltip>
  );
}
