import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, Camera, AlertCircle } from 'lucide-react';

export default function QRScanner({ onClose }) {
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    const handleScan = (detectedCodes) => {
        if (!detectedCodes || detectedCodes.length === 0) return;

        const rawValue = detectedCodes[0].rawValue;

        // LOGIC: Check if it's a valid URL for our app
        // We look for "/ticket/123" inside the string
        if (rawValue.includes('/ticket/')) {
            // Extract the Ticket ID safely
            // Example: "http://localhost:5173/ticket/14" -> "14"
            const parts = rawValue.split('/ticket/');
            if (parts.length > 1) {
                const ticketId = parts[1].split('?')[0]; // Remove any extra query params

                // Success! Go there and close scanner
                onClose();
                navigate(`/ticket/${ticketId}`);
            }
        } else {
            setError("Not a valid ticket QR code");
            // Clear error after 2 seconds so they can try again
            setTimeout(() => setError(null), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-fade-in">

            {/* HEADER */}
            <div className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
                <div className="text-white font-bold flex items-center gap-2">
                    <Camera className="text-emerald-400" />
                    <span>Scan Ticket Label</span>
                </div>
                <button onClick={onClose} className="btn btn-circle btn-sm btn-ghost text-white">
                    <X size={24} />
                </button>
            </div>

            {/* SCANNER VIEWPORT */}
            <div className="w-full max-w-md aspect-square relative overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl bg-black">
                <Scanner
                    onScan={handleScan}
                    onError={(error) => console.log(error)}
                    components={{
                        audio: false,
                        finder: false // We draw our own custom finder below
                    }}
                    styles={{
                        container: { width: '100%', height: '100%' }
                    }}
                />

                {/* CUSTOM OVERLAY (Red line scanner effect) */}
                <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none"></div>
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></div>

                {/* ERROR MESSAGE TOAST */}
                {error && (
                    <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                        <div className="bg-red-500/90 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg backdrop-blur-md animate-bounce-short">
                            <AlertCircle size={16} /> {error}
                        </div>
                    </div>
                )}
            </div>

            <p className="text-white/60 mt-8 text-sm font-medium">Point camera at the QR code on the device label</p>
        </div>
    );
}