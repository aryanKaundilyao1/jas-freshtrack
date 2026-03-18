import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

interface CameraScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  disabled?: boolean;
}

export default function CameraScanner({
  onBarcodeDetected,
  disabled,
}: CameraScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  const startCamera = async () => {
  try {
    setIsScanning(true);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.UPC_A,
]);

codeReader.current = new BrowserMultiFormatReader(hints);

    setTimeout(() => {
      codeReader.current!.decodeFromVideoElement(
        videoRef.current!,
        (result, err) => {
          if (result) {
            const code = result.getText();

            console.log("✅ Barcode:", code);

            toast({
              title: "Barcode detected",
              description: code,
            });

            onBarcodeDetected(code);
            stopCamera();
          }
        }
      );
    }, 800);

  } catch (error) {
    console.error("Camera error:", error);
    setIsScanning(false);
  }
};

  const stopCamera = () => {
  try {
    if (codeReader.current) {
      (codeReader.current as any).reset();
    }

    // 🔥 stop video stream manually
    const stream = videoRef.current?.srcObject as MediaStream;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  } catch (e) {
    console.error(e);
  }

  setIsScanning(false);
};

  return (
    <div className="flex flex-col gap-2">
      {isScanning && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%",
              borderRadius: "10px",
            objectFit: "cover" }}
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopCamera}
            className="absolute top-2 right-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={startCamera}
        disabled={disabled || isScanning}
        className="flex items-center gap-2"
      >
        {isScanning ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            Scanning...
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            Scan
          </>
        )}
      </Button>
    </div>
  );
}