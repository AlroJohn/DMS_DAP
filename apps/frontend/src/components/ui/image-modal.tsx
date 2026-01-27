"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSocket } from "@/components/providers/providers";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  alt: string;
}

export function ImageModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  alt,
}: ImageModalProps) {
  const label = (title || alt || "").toString();
  const isBarcode = /barcod/i.test(label);
  const printTitle = /qr\s*code|barcode/i.test(title || "")
    ? (alt || title || "").toString()
    : (title || alt || "").toString();
  const [isPrinting, setIsPrinting] = useState(false);
  const { socket } = useSocket();

  const bytesToBase64 = (bytes: Uint8Array) => {
    const chunkSize = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  };

  const concatBytes = (chunks: Uint8Array[]) => {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    chunks.forEach((chunk) => {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    return result;
  };

  const buildEscPosRaster = async () => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const dateStr = now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const textAreaHeight = 120;
    const qrSize = 256;
    const imageAreaHeight = isBarcode ? 320 : qrSize;

    let targetWidth = 576;
    let imageTargetWidth = 576;

    if (!isBarcode) {
      const measureCanvas = document.createElement("canvas");
      const measureCtx = measureCanvas.getContext("2d");
      if (!measureCtx) throw new Error("Canvas not supported");

      measureCtx.font = "bold 28px Arial";
      const titleWidth = measureCtx.measureText(printTitle).width;
      measureCtx.font = "20px Arial";
      const timeWidth = measureCtx.measureText(timeStr).width;
      const dateWidth = measureCtx.measureText(dateStr).width;
      const maxTextWidth = Math.max(titleWidth, timeWidth, dateWidth);

      targetWidth = Math.min(
        576,
        Math.max(qrSize, Math.ceil(maxTextWidth) + 24),
      );
      imageTargetWidth = qrSize;
    }

    const targetHeight = textAreaHeight + imageAreaHeight;

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas not supported");

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "bold 28px Arial";
    ctx.fillText(printTitle, targetWidth / 2, 8);
    ctx.font = "20px Arial";
    ctx.fillText(timeStr, targetWidth / 2, 48);
    ctx.fillText(dateStr, targetWidth / 2, 74);

    const scale = Math.min(
      imageTargetWidth / img.width,
      imageAreaHeight / img.height,
    );
    const drawWidth = Math.round(img.width * scale);
    const drawHeight = Math.round(img.height * scale);
    const offsetX = Math.floor((targetWidth - drawWidth) / 2);
    const offsetY =
      textAreaHeight + Math.floor((imageAreaHeight - drawHeight) / 2);

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const { data } = imageData;
    const widthBytes = Math.ceil(targetWidth / 8);
    const raster = new Uint8Array(widthBytes * targetHeight);

    for (let y = 0; y < targetHeight; y += 1) {
      for (let xByte = 0; xByte < widthBytes; xByte += 1) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit += 1) {
          const x = xByte * 8 + bit;
          if (x >= targetWidth) continue;
          const idx = (y * targetWidth + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const isBlack = a > 32 && luminance < 160;
          if (isBlack) {
            byte |= 0x80 >> bit;
          }
        }
        raster[y * widthBytes + xByte] = byte;
      }
    }

    const header = new Uint8Array([
      0x1d,
      0x76,
      0x30,
      0x00,
      widthBytes & 0xff,
      (widthBytes >> 8) & 0xff,
      targetHeight & 0xff,
      (targetHeight >> 8) & 0xff,
    ]);

    const init = new Uint8Array([0x1b, 0x40, 0x1b, 0x61, 0x01]);
    const feed = new Uint8Array([0x1b, 0x64, 0x04]);

    return concatBytes([init, header, raster, feed]);
  };

  // Print via socket -> printer service
  const handlePrint = async () => {
    if (!imageUrl) return;
    if (!socket) {
      alert("Printer service is not connected");
      return;
    }

    setIsPrinting(true);

    try {
      const jobId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      
      // For Brother label printer, send the barcode data directly
      // Extract document code from title (e.g., "ADMIN-012626-A0001")
      const documentCode = printTitle || title || alt || "";
      
      await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error("Printer response timed out"));
        }, 15000);

        const cleanup = () => {
          window.clearTimeout(timeout);
          socket.off("printSuccess", onSuccess);
          socket.off("printError", onError);
        };

        const onSuccess = (data: any) => {
          if (data?.jobId !== jobId) return;
          cleanup();
          resolve(data);
        };

        const onError = (data: any) => {
          if (data?.jobId !== jobId) return;
          cleanup();
          reject(new Error(data?.error || "Printer error"));
        };

        socket.on("printSuccess", onSuccess);
        socket.on("printError", onError);

        socket.emit(
          "printer:print",
          {
            jobId,
            printType: isBarcode ? "barcode" : "qrcode",
            documentCode: documentCode,
            barcodeData: documentCode, // Also send as barcodeData for compatibility
            organizationName: "Property of: DAP", // Full organization name for label
            labelFormat: "brother-label", // Indicate this is for Brother label format
            useUSB: true, // Explicitly indicate USB printing
          },
          (ack: { success?: boolean; error?: string } | undefined) => {
            if (!ack?.success) {
              cleanup();
              reject(new Error(ack?.error || "Failed to queue print"));
            }
          },
        );
      });
    } catch (err) {
      console.error("❌ Print failed", err);
      alert("Failed to print image");
    } finally {
      setIsPrinting(false);
    }
  };

  // Download the QR code or barcode image
  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    const suffix = isBarcode ? "barcode" : "qr";
    link.download = `${title.replace(/\s+/g, "_").toLowerCase()}_${suffix}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full max-h-[90vh] p-6 rounded-xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">{title}</DialogTitle>
        </DialogHeader>
        <div
          id="qr-modal-print-area"
          className="flex flex-col items-center justify-center gap-4 py-4"
        >
          <span className="print-modal-title hidden">{title}</span>
          {imageUrl ? (
            isBarcode ? (
              // For barcodes: place image inside a padded, rounded card so corners have padding
              <div className="w-full max-w-[640px] bg-white p-4 rounded-lg shadow-lg border">
                <img
                  src={imageUrl}
                  alt={alt}
                  className="print-modal-img w-full h-40 object-contain"
                  style={{
                    imageRendering: "pixelated",
                    width: "100%",
                    height: "160px",
                    maxWidth: "640px",
                    background: "transparent",
                  }}
                />
              </div>
            ) : (
              // QR codes remain square and crisp
              <img
                src={imageUrl}
                alt={alt}
                className="print-modal-img w-64 h-64 object-contain rounded-lg border shadow-lg"
                style={{
                  imageRendering: "pixelated",
                  width: "256px",
                  height: "256px",
                  maxWidth: "100%",
                  maxHeight: "384px",
                  background: "#fff",
                }}
              />
            )
          ) : (
            <div className="flex items-center justify-center h-64 w-96 bg-muted rounded-lg border">
              <p className="text-muted-foreground">No image available</p>
            </div>
          )}
        </div>
        <div className="flex justify-center gap-3 mt-2">
          <button
            type="button"
            onClick={handlePrint}
            className={`px-4 w-32 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors shadow ${isPrinting ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={isPrinting || !imageUrl}
          >
            {isPrinting ? "Printing..." : "Print"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 w-32 py-2 bg-secondary text-primary rounded hover:bg-secondary/80 transition-colors shadow border border-primary"
            disabled={!imageUrl}
          >
            Download
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
