import { Progress } from "@/components/ui/progress";
import { Loader2, FileSearch } from "lucide-react";

interface ConversionProgressProps {
  progress: number; // 0-100
  stage?: string;
  className?: string;
}

export function ConversionProgress({
  progress,
  stage = "Converting",
  className,
}: ConversionProgressProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="font-medium">{stage}</span>
        </div>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {progress < 30 && "Analyzing document structure..."}
        {progress >= 30 && progress < 60 && "Extracting text content..."}
        {progress >= 60 && progress < 90 && "Building searchable index..."}
        {progress >= 90 && "Finalizing conversion..."}
      </p>
    </div>
  );
}

// Inline compact version
export function ConversionProgressInline({
  progress,
  className,
}: {
  progress: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <FileSearch className="h-4 w-4 text-blue-500" />
      <Progress value={progress} className="h-1.5 w-24" />
      <span className="text-xs text-muted-foreground">{progress}%</span>
    </div>
  );
}
