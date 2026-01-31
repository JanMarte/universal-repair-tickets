import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QRScanner({ onClose, onScan }) {
    const scannerRef = useRef(null);

    useEffect(() => {
        // 1. Initialize Scanner
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                disableFlip: false,
                showTorchButtonIfSupported: true
            },
            /* verbose= */ false
        );

        // 2. Render Scanner
        scanner.render(
            (decodedText) => {
                console.log("Scanned:", decodedText);

                // Stop the scanner immediately to free the camera/UI
                scanner.clear().then(() => {
                    onScan(decodedText);
                }).catch(err => {
                    console.error("Failed to clear scanner", err);
                    onScan(decodedText);
                });
            },
            (errorMessage) => {
                // Ignore frame parse errors (scanning in progress)
            }
        );

        scannerRef.current = scanner;

        // 3. Cleanup on Unmount
        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear();
                } catch (e) {
                    console.error("Error clearing scanner on unmount", e);
                }
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in">

            {/* --- CRITICAL CSS OVERRIDE --- */}
            <style>{`
                /* 1. Force the main container to handle text color */
                #reader {
                    border: none !important;
                    font-family: inherit;
                }
                
                /* 2. FORCE ALL TEXT TO BLACK (Fixes "Request Permission" visibility) */
                #reader * {
                    color: #1f2937 !important; /* Dark Gray */
                }

                /* 3. Style the "Request Permission" Button specifically */
                #reader button {
                    color: #ffffff !important; /* White Text */
                    background-color: #4f46e5 !important; /* Indigo-600 */
                    border: none !important;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-weight: bold;
                    margin-top: 15px;
                    cursor: pointer;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }

                /* 4. Style Dropdowns (Camera Select) */
                #reader select {
                    background-color: #f3f4f6 !important;
                    border: 1px solid #d1d5db !important;
                    padding: 8px;
                    border-radius: 8px;
                    margin-bottom: 10px;
                    width: 100%;
                    color: #000 !important;
                }

                /* 5. Hide the weird "Scan an Image File" link if you want (Optional) */
                #reader__dashboard_section_swaplink {
                    text-decoration: underline;
                    margin-top: 10px;
                    display: inline-block;
                }
            `}</style>

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 btn btn-circle btn-ghost text-white z-50 bg-black/50 hover:bg-black/70 border-none"
            >
                <X size={32} />
            </button>

            {/* Scanner Container */}
            <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden relative shadow-2xl p-4">
                <div id="reader" className="w-full h-full"></div>
            </div>

            <p className="text-white font-bold mt-6 text-center opacity-80 animate-pulse">
                Point camera at Ticket QR Code
            </p>
        </div>
    );
}