"use client";

import * as React from "react";
import { toast } from "sonner";
import Webcam from "react-webcam";
import jsQR from "jsqr";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ReleaseDocumentModal } from "@/components/modals/release-document-modal";
import type { DocumentListItem } from "@/hooks/use-documents";
import { useAuth } from "@/hooks/use-auth";
import { hasAnyPermission } from "@/lib/document-permissions";
import { getAccessToken } from "@/lib/token-utils";
import { Camera, Upload, X } from "lucide-react";

interface DocumentLookup {
  document_id: string;
  document_code: string;
  title: string;
  classification: string;
  status: string;
  document_type: string;
  created_at: string;
  owner?: {
    user_id: string;
    first_name: string;
    last_name: string;
    department_id: string;
  };
  originating_department?: {
    department_id: string;
  };
  isOwner?: boolean;
  isFromSameDepartment?: boolean;
  isAssignedToUserDepartment?: boolean;
  latestTransitTrail?: {
    to_department: string;
    from_department: string;
    user_id: string;
    action_date: string;
  };
}

interface TransmitByCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TransmitByCodeModal({
  isOpen,
  onClose,
}: TransmitByCodeModalProps) {
  const [documentCode, setDocumentCode] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [isReceiving, setIsReceiving] = React.useState(false);
  const [document, setDocument] = React.useState<DocumentLookup | null>(null);
  const [releaseDocument, setReleaseDocument] =
    React.useState<DocumentListItem | null>(null);
  const [isReleaseOpen, setIsReleaseOpen] = React.useState(false);
  const [scanMode, setScanMode] = React.useState<"manual" | "camera" | "upload" | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [qrDetected, setQrDetected] = React.useState(false);
  const [detectedCode, setDetectedCode] = React.useState<string | null>(null);
  const [qrLocation, setQrLocation] = React.useState<{ x: number; y: number; size: number } | null>(null);
  const [autoScanTriggered, setAutoScanTriggered] = React.useState(false);
  const webcamRef = React.useRef<Webcam>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const detectionCountRef = React.useRef<number>(0);
  const lastDetectedCodeRef = React.useRef<string | null>(null);
  
  const { user: currentUser } = useAuth();
  const canRelease = hasAnyPermission(currentUser, [
    "document_transfer_initiate",
    "document_transfer_approve",
    "document_write",
  ]);
  const canReceive = hasAnyPermission(currentUser, [
    "document_transfer_receive",
    "document_write",
  ]);

  React.useEffect(() => {
    if (!isOpen && !isReleaseOpen) {
      setDocumentCode("");
      setDocument(null);
      setReleaseDocument(null);
      setIsSearching(false);
      setIsReceiving(false);
      setScanMode(null);
      setIsScanning(false);
      setQrDetected(false);
      setDetectedCode(null);
      setQrLocation(null);
      setAutoScanTriggered(false);
      detectionCountRef.current = 0;
      lastDetectedCodeRef.current = null;
    }
  }, [isOpen, isReleaseOpen]);

  // Real-time QR detection from webcam
  React.useEffect(() => {
    if (scanMode !== "camera" || !webcamRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setQrDetected(false);
      setQrLocation(null);
      setDetectedCode(null);
      detectionCountRef.current = 0;
      lastDetectedCodeRef.current = null;
      return;
    }

    let lastDetectionTime = 0;
    const detectionInterval = 100; // Run detection every 100ms for faster response

    const detectQRCode = (timestamp: number) => {
      const webcam = webcamRef.current;
      const canvas = canvasRef.current;
      
      if (!webcam || !canvas) {
        animationFrameRef.current = requestAnimationFrame(detectQRCode);
        return;
      }

      const video = webcam.video;
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(detectQRCode);
        return;
      }

      // Throttle detection to avoid overprocessing
      if (timestamp - lastDetectionTime < detectionInterval) {
        animationFrameRef.current = requestAnimationFrame(detectQRCode);
        return;
      }

      lastDetectionTime = timestamp;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        animationFrameRef.current = requestAnimationFrame(detectQRCode);
        return;
      }

      // Use higher resolution for better detection
      const scale = 0.8; // Increased from 0.75 for better accuracy
      const width = Math.floor(video.videoWidth * scale);
      const height = Math.floor(video.videoHeight * scale);

      canvas.width = width;
      canvas.height = height;

      context.drawImage(video, 0, 0, width, height);
      const imageData = context.getImageData(0, 0, width, height);

      try {
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          setQrDetected(true);
          setDetectedCode(code.data);
          
          // Calculate QR code position relative to video dimensions
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;
          
          // Get center point of QR code
          const centerX = (code.location.topLeftCorner.x + code.location.bottomRightCorner.x) / 2;
          const centerY = (code.location.topLeftCorner.y + code.location.bottomRightCorner.y) / 2;
          
          // Calculate size (average of width and height)
          const qrWidth = Math.abs(code.location.bottomRightCorner.x - code.location.topLeftCorner.x);
          const qrHeight = Math.abs(code.location.bottomRightCorner.y - code.location.topLeftCorner.y);
          const qrSize = (qrWidth + qrHeight) / 2;
          
          // Scale to actual video display size (since we downscaled for processing)
          const displayCenterX = (centerX / width) * videoWidth;
          const displayCenterY = (centerY / height) * videoHeight;
          const displaySize = (qrSize / width) * videoWidth;
          setQrLocation(null);
          
          setQrLocation({
            x: displayCenterX,
            y: displayCenterY,
            size: displaySize
          });
          
        setQrLocation(null);
          // 
          // Auto-scan logic: detect same code 2 consecutive times for faster response
          if (lastDetectedCodeRef.current === code.data) {
            detectionCountRef.current += 1;
            
            // Auto-trigger scan after 2 consistent detections (~200ms)
            if (detectionCountRef.current >= 2 && !autoScanTriggered) {
              setAutoScanTriggered(true);
              handleAutoCapture(code.data);
            }
          } else {
            // New code detected, reset counter
            lastDetectedCodeRef.current = code.data;
            detectionCountRef.current = 1;
          }
        } else {
          setQrDetected(false);
          setDetectedCode(null);
          detectionCountRef.current = 0;
          lastDetectedCodeRef.current = null;
        }
      } catch (error) {
        console.error("QR detection error:", error);
        setQrDetected(false);
        setDetectedCode(null);
        detectionCountRef.current = 0;
        lastDetectedCodeRef.current = null;
      }

      // Continue the loop
      animationFrameRef.current = requestAnimationFrame(detectQRCode);
    };

    // Start the detection loop
    animationFrameRef.current = requestAnimationFrame(detectQRCode);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [scanMode, autoScanTriggered]);

  const handleScanImage = async (imageFile: File) => {
    setIsScanning(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      const token = getAccessToken();
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/scanner/scan", {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      });

      // Try to parse JSON, handle errors gracefully
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error("Failed to parse response as JSON:", jsonError);
        throw new Error("Server returned invalid response. Check backend logs.");
      }

      if (!response.ok) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (typeof result.message === 'string' ? result.message : "Failed to scan image");
        throw new Error(errorMsg);
      }

      if (result.success && result.data) {
        const scannedCode = result.data;
        setDocumentCode(scannedCode);
        setScanMode(null);
        toast.success(`QR Code scanned: ${scannedCode}`);
        
        // Automatically search for the document
        setIsScanning(false);
        await searchDocument(scannedCode);
      } else {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : "No QR code found in image";
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error("Scan error:", error);
      const errorMessage = error.message || "Failed to scan image";
      toast.error(errorMessage);
      setIsScanning(false);
    }
  };

  const handleAutoCapture = async (code: string) => {
    if (isScanning) return;
    
    // Directly use the detected code without backend processing
    setDocumentCode(code);
    setScanMode(null);
    toast.success(`QR Code detected: ${code}`);
    
    // Automatically search for the document
    await searchDocument(code);
  };

  const handleCameraCapture = async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast.error("Failed to capture image");
      return;
    }

    // Convert base64 to blob
    const res = await fetch(imageSrc);
    const blob = await res.blob();
    const file = new File([blob], "camera-capture.png", { type: "image/png" });
    
    await handleScanImage(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    handleScanImage(file);
  };

  const searchDocument = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Please enter a document code.");
      return;
    }

    setIsSearching(true);
    setDocument(null);

    try {
      // Get token from localStorage or cookies
      const token = getAccessToken();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add Authorization header if token exists
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `/api/documents/search?q=${encodeURIComponent(trimmed)}`,
        {
          credentials: "include",
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || errorData.error || "Search failed."
        );
      }

      const result = await response.json().catch(() => ({}));
      const documents = Array.isArray(result?.data) ? result.data : [];
      const normalised = trimmed.toLowerCase();
      const matched =
        documents.find(
          (doc: DocumentLookup) =>
            (doc.document_code || "").toLowerCase() === normalised
        ) || documents[0];

      if (!matched) {
        toast.error("Document code not found.");
        return;
      }

      setDocument(matched);
      toast.success("Document found!");
    } catch (error: any) {
      console.error("Lookup error:", error);
      toast.error(error.message || "Failed to find document.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLookup = async () => {
    await searchDocument(documentCode);
  };

  const handleReceive = async () => {
    if (!document) {
      toast.error("Please lookup a document first.");
      return;
    }

    if (!canReceive) {
      toast.error("You don't have permission to receive documents.");
      return;
    }

    if (document.status !== "intransit") {
      toast.error("Document must be in transit to receive.");
      return;
    }

    // Check if the document is assigned to the user's department
    if (!document.isAssignedToUserDepartment) {
      toast.error(
        "You can only receive documents that are assigned to your department."
      );
      return;
    }

    setIsReceiving(true);

    try {
      // Get token from localStorage or cookies
      const token = getAccessToken();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add Authorization header if token exists
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `/api/documents/${document.document_id}/receive`,
        {
          method: "POST",
          credentials: "include",
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || errorData.error || "Failed to receive."
        );
      }

      toast.success("Document received successfully.");
      onClose();
    } catch (error: any) {
      console.error("Receive error:", error);
      toast.error(error.message || "Failed to receive document.");
    } finally {
      setIsReceiving(false);
    }
  };

  const handleRelease = () => {
    if (!document) {
      toast.error("Please lookup a document first.");
      return;
    }

    if (!canRelease) {
      toast.error("You don't have permission to release documents.");
      return;
    }

    // Check if the user is the owner of the document or from the same department
    const isOwner = document.isOwner;
    const isFromSameDepartment = document.isFromSameDepartment;

    if (!isOwner && !isFromSameDepartment) {
      toast.error(
        "You can only release documents that you own or that were created in your department."
      );
      return;
    }

    const mapped: DocumentListItem = {
      id: document.document_id,
      qrCode: "",
      barcode: "",
      document: document.title || "Untitled",
      documentId: document.document_code || document.document_id,
      contactPerson: "N/A",
      contactOrganization: "N/A",
      currentLocation: "N/A",
      type: document.document_type || "General",
      classification: document.classification || "simple",
      status: document.status || "pending",
      activity: "lookup",
      activityTime: document.created_at || new Date().toISOString(),
    };

    setReleaseDocument(mapped);
    setIsReleaseOpen(true);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Transmit by Document Code</DialogTitle>
            <DialogDescription>
              Enter a document code to release or receive a document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Scan Mode Selection */}
            {!scanMode && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter document code (e.g., ADMIN-2026-VJJD)"
                    value={documentCode}
                    onChange={(event) => setDocumentCode(event.target.value)}
                  />
                  <Button onClick={handleLookup} disabled={isSearching}>
                    {isSearching ? "Searching..." : "Find"}
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setScanMode("camera")}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Scan with Camera
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            )}

            {/* Camera Mode */}
            {scanMode === "camera" && (
              <div className="space-y-2">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/png"
                    videoConstraints={{
                      facingMode: "environment",
                    }}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Hidden canvas for QR detection */}
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Crosshair overlay when QR code is detected */}
                  {qrDetected && qrLocation && (
                    <div 
                      className="absolute pointer-events-none"
                      style={{
                        left: `${(qrLocation.x / webcamRef.current?.video?.videoWidth! || 1) * 100}%`,
                        top: `${(qrLocation.y / webcamRef.current?.video?.videoHeight! || 1) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {/* Crosshair lines */}
                      <div className="relative">
                        {/* Horizontal line */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-0.5 bg-green-500">
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 ring-2 ring-green-400" />
                        </div>
                        {/* Vertical line */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-16 bg-green-500" />
                        
                        {/* Animated pulse ring */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 border-green-500 animate-ping" />
                      </div>
                    </div>
                  )}
                  
                  {/* vas ref={canvasRef} className="hidden" />
                  
                  {/* QR Code Detection Box - Green when detected */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-64 h-64">
                      {/* Corner indicators */}
                      <div 
                        className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 transition-colors duration-200 ${
                          qrDetected ? "border-green-500" : "border-white/50"
                        }`} 
                      />
                      <div 
                        className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 transition-colors duration-200 ${
                          qrDetected ? "border-green-500" : "border-white/50"
                        }`} 
                      />
                      <div 
                        className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 transition-colors duration-200 ${
                          qrDetected ? "border-green-500" : "border-white/50"
                        }`} 
                      />
                      <div 
                        className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 transition-colors duration-200 ${
                          qrDetected ? "border-green-500" : "border-white/50"
                        }`} 
                      />
                      
                      {/* Center border */}
                      <div 
                        className={`absolute inset-0 border-2 rounded-lg transition-colors duration-200 ${
                          qrDetected ? "border-green-500" : "border-white/30"
                        }`} 
                      />
                    </div>
                  </div>

                  {isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-white text-sm font-medium animate-pulse">
                        Scanning...
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute bottom-2 left-2 right-2 text-center text-white text-xs bg-black/50 p-2 rounded">
                    {qrDetected && detectedCode ? (
                      <div className="space-y-1">
                        <div className="text-green-400 font-semibold">
                          ✓ QR Detected: {detectedCode}
                        </div>
                        <div className="text-green-300 text-[10px]">
                          {detectionCountRef.current >= 2 ? "Processing..." : `Hold steady... (${detectionCountRef.current}/2)`}
                        </div>
                      </div>
                    ) : (
                      "Position QR code within the box"
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setScanMode(null);
                      setAutoScanTriggered(false);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCameraCapture}
                    disabled={isScanning}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {isScanning ? "Scanning..." : "Manual Scan"}
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Hold QR code steady for automatic scanning
                </p>
              </div>
            )}

            {document && (
              <div className="rounded-md border p-3 text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{document.document_code}</Badge>
                  <span className="truncate">{document.title}</span>
                </div>
                <div className="text-muted-foreground">
                  Status: <span className="font-medium">{document.status}</span>
                </div>
                <div className="text-muted-foreground">
                  Classification:{" "}
                  <span className="font-medium">{document.classification}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {document.isOwner && (
                    <Badge variant="secondary">Document Owner</Badge>
                  )}
                  {document.isFromSameDepartment && !document.isOwner && (
                    <Badge variant="secondary">From Your Department</Badge>
                  )}
                  {!document.isOwner && !document.isFromSameDepartment && (
                    <Badge variant="destructive">Not Authorized</Badge>
                  )}
                  {document.status === "intransit" &&
                    document.isAssignedToUserDepartment && (
                      <Badge variant="default">
                        Assigned to Your Department
                      </Badge>
                    )}
                  {document.status === "intransit" &&
                    !document.isAssignedToUserDepartment && (
                      <Badge variant="destructive">
                        Not Assigned to Your Department
                      </Badge>
                    )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={handleReceive}
              disabled={
                !document ||
                isReceiving ||
                !canReceive ||
                (document &&
                  document.status === "intransit" &&
                  !document.isAssignedToUserDepartment)
              }
            >
              {isReceiving ? "Receiving..." : "Receive"}
            </Button>
            <Button
              onClick={handleRelease}
              disabled={
                !document ||
                !canRelease ||
                (document &&
                  !document.isOwner &&
                  !document.isFromSameDepartment)
              }
            >
              Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReleaseDocumentModal
        document={releaseDocument}
        isOpen={isReleaseOpen}
        onClose={() => setIsReleaseOpen(false)}
      />
    </>
  );
}
