import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string;
  fileName: string;
  previewMime: string;
  onDownload: () => void;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  previewUrl,
  fileName,
  previewMime,
  onDownload,
}: DocumentPreviewModalProps) {
  const isImage = previewMime.startsWith("image/");
  const isPDF = previewMime.includes("pdf");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full p-0 border-0 bg-background overflow-hidden flex flex-col">
        <div className="sr-only">
          <DialogTitle>{fileName}</DialogTitle>
        </div>
        
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold truncate max-w-[60%]">{fileName}</h3>
        </div>
        <div className="flex-1 overflow-auto relative">
          {isImage ? (
            <div className="flex items-center justify-center min-h-full p-4">
              <img
                src={previewUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : isPDF ? (
            <div className="w-full h-full">
              <iframe
                src={`${previewUrl}#toolbar=1&statusbar=1&view=Fit&pagemode=thumbs`}
                title={fileName}
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <p className="text-lg text-muted-foreground mb-4">
                Preview is not available for this file type
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                {fileName}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}