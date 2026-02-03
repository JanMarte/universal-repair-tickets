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
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
            {/* Header Overlay */}
            <div className="absolute top-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
                <div className="text-white font-bold flex items-center gap-2">
                    <Camera size={20} className="text-indigo-400" /> Scanning...
                </div>
                <button onClick={onClose} className="btn btn-circle btn-sm btn-ghost text-white bg-white/20 backdrop-blur-md">
                    <X size={20} />
                </button>
            </div>

            {/* Camera View */}
            <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-80" muted />
                <canvas ref={canvasRef} className="hidden" />

                {/* Targeting Reticle */}
                <div className="relative w-64 h-64 border-2 border-white/30 rounded-3xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1 rounded-br-lg"></div>

                    {/* Scanning Laser Effect */}
                    <div className="w-full h-0.5 bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-scan absolute"></div>
                </div>
            </div>

            {/* Footer Hint */}
            <div className="absolute bottom-10 text-white/90 text-sm bg-black/60 px-6 py-3 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" /> Point camera at a barcode
            </div>
        </div>
    );
}