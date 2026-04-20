import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download } from 'lucide-react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  showDownload?: boolean;
  employeeName?: string;
}

export function QRCodeGenerator({ value, size = 200, showDownload = false, employeeName }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#0B3060',
          light: '#FFFFFF',
        },
      });
    }
  }, [value, size]);

  const handleDownload = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `QR_${employeeName || value}_${new Date().getTime()}.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} />
      {showDownload && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Download QR Code
        </button>
      )}
    </div>
  );
}