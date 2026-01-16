"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [isPrinting, setIsPrinting] = useState(false);

  // Send image to thermal printer service
  const handlePrint = async () => {
    if (!imageUrl) return;

    setIsPrinting(true);

    try {
      // Dynamically import socket.io-client
      const { io } = await import('socket.io-client');

      // Connect to the printer Socket.IO service
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_IO_URL || process.env.NEXT_PUBLIC_PRINTER_SOCKET_URL || 'https://quanby-staging.com'; // Using the same URL as in the printer service
      const socket = io(socketUrl, {
        transports: ['websocket'],
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => {
          console.log('Connected to Socket.IO server:', socket.id);
          resolve();
        });

        socket.on('connect_error', (error: any) => {
          console.error('Socket.IO connection error:', error);
          reject(error);
        });

        // Set timeout for connection
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Prepare print data for thermal printer
      const printData = {
        app: 'dms', // Changed from 'pcso' to 'dms' for this application
        data: {
          event: 'printing',
          type: isBarcode ? 'barcode' : 'qr_code',
          title: title,
          imageUrl: imageUrl,
          timestamp: new Date().toISOString(),
          printer_ip: process.env.NEXT_PUBLIC_PRINTER_IP || '192.168.1.100' // Default IP if not set
        }
      };

      // Send print job to printer service via 'printJob' event
      socket.emit('printJob', printData);

      // Listen for print success/error responses
      socket.on('printSuccess', (response: any) => {
        console.log('Print job completed successfully:', response);
      });

      socket.on('printError', (error: any) => {
        console.error('Print job failed:', error);
        alert(`Print job failed: ${error.error || 'Unknown error'}`);
      });

      // Disconnect after sending
      setTimeout(() => {
        socket.close();
      }, 2000); // Give some time for the print job to be processed

      console.log('Print job sent to thermal printer');
    } catch (error) {
      console.error('Error sending print job:', error);
      alert('Failed to send print job to thermal printer. Please check printer connection.');
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
            className={`px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors shadow ${isPrinting ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isPrinting || !imageUrl}
          >
            {isPrinting ? 'Printing...' : 'Print'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-2 bg-secondary text-primary rounded hover:bg-secondary/80 transition-colors shadow border border-primary"
            disabled={!imageUrl}
          >
            Download
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
