'use client'

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

interface ImageModalProps {
    isOpen: boolean
    onClose: () => void
    imageUrl: string
    title: string
    alt: string
}

export function ImageModal({
    isOpen,
    onClose,
    imageUrl,
    title,
    alt,
}: ImageModalProps) {
    const label = (title || alt || '').toString();
    const isBarcode = /barcod/i.test(label);
    // Print only the modal content
    const handlePrint = () => {
        const printContents = document.getElementById('qr-modal-print-area')?.innerHTML;
        if (!printContents) return;
        const printWindow = window.open('', '', 'width=600,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Print QR Code</title>
                    <style>
                        body { margin: 0; font-family: sans-serif; }
                        .print-modal-title { text-align: center; font-size: 1.5rem; margin: 1.5rem 0 1rem 0; }
                        /* Allow larger barcodes to print clearly while keeping QR sizes readable */
                        .print-modal-img { display: block; margin: 0 auto; max-width: 640px; max-height: 640px; }
                    </style>
                </head>
                <body>
                    ${printContents}
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
    };

    // Download the QR code or barcode image
    const handleDownload = () => {
        if (!imageUrl) return;
        const link = document.createElement('a');
        link.href = imageUrl;
        const suffix = isBarcode ? 'barcode' : 'qr';
        link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_${suffix}.png`;
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
                <div id="qr-modal-print-area" className="flex flex-col items-center justify-center gap-4 py-4">
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
                                        imageRendering: 'pixelated',
                                        width: '100%',
                                        height: '160px',
                                        maxWidth: '640px',
                                        background: 'transparent',
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
                                    imageRendering: 'pixelated',
                                    width: '256px',
                                    height: '256px',
                                    maxWidth: '100%',
                                    maxHeight: '384px',
                                    background: '#fff',
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
                        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors shadow"
                    >
                        Print
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
    )
}
