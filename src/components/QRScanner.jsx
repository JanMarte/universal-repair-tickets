import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Camera, Zap } from 'lucide-react';

export default function QRScanner({ onClose, onScan }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        let stream = null;
        let animationFrameId = null;

        const startCamera = async () => {
            try {
                // Request camera (prefer back camera)
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // iOS fix: requires playsinline to play in-page
                    videoRef.current.setAttribute("playsinline", true);
                    videoRef.current.play();
                    requestAnimationFrame(tick);
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setIsScanning(false);
            }
        };

        const tick = () => {
            if (!videoRef.current || !canvasRef.current) return;

            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const canvas = canvasRef.current;
                const video = videoRef.current;

                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });

                if (code) {
                    // Success!
                    onScan(code.data);
                    stopCamera(); // Kill stream immediately
                }
            }

            if (isScanning) {
                animationFrameId = requestAnimationFrame(tick);
            }
        };

        const stopCamera = () => {
            setIsScanning(false);
            if (stream) {
                stream.getTracks().forEach(track => track.stop()); // The critical fix
                stream = null;
            }
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };

        startCamera();

        // CLEANUP: This runs when the modal closes
        return () => {
            stopCamera();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">

            {/* Camera View - Sent to the absolute back layer (z-0) */}
            <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden z-0">
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-80" muted />
                <canvas ref={canvasRef} className="hidden" />

                {/* Targeting Reticle */}
                <div className="relative z-10 w-64 h-64 border-2 border-white/30 rounded-3xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1 rounded-br-lg"></div>
                    <div className="w-full h-0.5 bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-scan absolute"></div>
                </div>
            </div>

            {/* Header Text - Isolated and made unclickable */}
            <div className="absolute top-4 left-4 z-[10000] text-white font-bold flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full pointer-events-none">
                <Camera size={20} className="text-indigo-400" /> Scanning...
            </div>

            {/* NUCLEAR CLOSE BUTTON - Completely decoupled, extreme z-index, forced pointer events */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Scanner Close Clicked!");
                    onClose();
                }}
                className="absolute top-10 right-4 z-[99999] btn btn-circle btn-error text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] border-2 border-white/20 hover:scale-105 transition-transform"
                style={{ pointerEvents: 'all', cursor: 'pointer', touchAction: 'manipulation' }}
            >
                <X size={24} />
            </button>

            {/* Footer Hint */}
            <div className="absolute bottom-10 z-[10000] text-white/90 text-sm bg-black/60 px-6 py-3 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-2 pointer-events-none">
                <Zap size={14} className="text-yellow-400" /> Point camera at a barcode
            </div>

        </div>
    );
}