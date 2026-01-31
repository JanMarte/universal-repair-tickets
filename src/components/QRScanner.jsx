import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QRScanner({ onClose, onScan }) {
    const scannerRef = useRef(null);
    const [scanError, setScanError] = useState(null);

    useEffect(() => {
        // 1. Initialize Scanner
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                disableFlip: false,
            },
            /* verbose= */ false
        );

        // 2. Render Scanner
        scanner.render(
            (decodedText) => {
                // SUCCESS:
                console.log("Scanned:", decodedText);

                // A. Stop the scanner immediately to free the camera/UI
                scanner.clear().then(() => {
                    // B. Send data to parent
                    onScan(decodedText);
                }).catch(err => {
                    console.error("Failed to clear scanner", err);
                    onScan(decodedText); // Proceed anyway
                });
            },
            (errorMessage) => {
                // IGNORE: scanning in progress...
            }
        );

        scannerRef.current = scanner;

        // 3. Cleanup on Unmount (CRITICAL)
        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear();
                } catch (e) {
                    console.error("Error clearing scanner on unmount", e);
                }
            }
        };
    }, []); // Empty dependency array = run once on mount

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 btn btn-circle btn-ghost text-white z-50 bg-black/50"
            >
                <X size={32} />
            </button>

            <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden relative">
                <div id="reader" className="w-full h-full"></div>
            </div>

            <p className="text-white font-bold mt-6 text-center animate-pulse">
                Point camera at Ticket QR Code
            </p>
        </div>
    );
}