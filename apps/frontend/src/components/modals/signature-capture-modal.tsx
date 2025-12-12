"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import SignatureCanvas from "react-signature-canvas";
import { Loader2, Upload, Eraser } from "lucide-react";
import { toast } from "sonner";
import { Label } from "../ui/label";

interface SignatureCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (signatureData: string) => void;
  documentTitle: string;
}

export function SignatureCaptureModal({
  open,
  onOpenChange,
  onConfirm,
  documentTitle,
}: SignatureCaptureModalProps) {
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("draw");
  const [isLoading, setIsLoading] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);

  const handleConfirm = () => {
    if (!signatureData) {
      toast.error("Please provide a signature before confirming.");
      return;
    }
    onConfirm(signatureData);
    onOpenChange(false);
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setSignatureData(null);
  };

  const handleDrawEnd = () => {
    const data = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
    if (data) {
      setSignatureData(data);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        // 1MB limit
        toast.error("File size should be less than 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        setSignatureData(data);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetState = () => {
    setIsLoading(false);
    setSignatureData(null);
    setActiveTab("draw");
    sigCanvas.current?.clear();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetState();
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sign Document</DialogTitle>
          <DialogDescription>
            Provide your signature for: <strong>{documentTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw">Draw Signature</TabsTrigger>
            <TabsTrigger value="upload">Upload Signature</TabsTrigger>
          </TabsList>
          <TabsContent value="draw">
            <div className="relative w-full h-48 rounded-md border border-input bg-background">
              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                canvasProps={{ className: "w-full h-full" }}
                onEnd={handleDrawEnd}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSignature}
              className="mt-2 text-muted-foreground"
            >
              <Eraser className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </TabsContent>
          <TabsContent value="upload">
            <div className="flex flex-col items-center justify-center w-full h-48 rounded-md border-2 border-dashed border-input bg-background p-4">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <Label
                htmlFor="signature-upload"
                className="text-center text-sm text-muted-foreground cursor-pointer"
              >
                Click to upload or drag and drop
                <br />
                PNG, JPG, or SVG (max 1MB)
              </Label>
              <Input
                id="signature-upload"
                type="file"
                className="sr-only"
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={handleFileUpload}
              />
            </div>
          </TabsContent>
        </Tabs>

        {signatureData && (
          <div className="mt-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Signature Preview:
            </p>
            <div className="p-4 border rounded-md flex items-center justify-center bg-gray-50">
              <img
                src={signatureData}
                alt="Signature Preview"
                className="max-h-24"
              />
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!signatureData}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing...
              </>
            ) : (
              "Sign and Confirm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
