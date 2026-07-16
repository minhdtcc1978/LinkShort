'use client';

import { useState } from 'react';
import { QrCode as QrCodeIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';

interface QRCodeGeneratorProps {
  shortUrl: string;
  originalUrl: string;
}

export function QRCodeGenerator({ shortUrl, originalUrl }: QRCodeGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const generateQRCode = async () => {
    try {
      // Use a reliable QR code generation API
      const encodedUrl = encodeURIComponent(shortUrl);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}`;
      setQrCode(qrUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const handleDownload = async () => {
    if (!qrCode) return;

    try {
      const response = await fetch(qrCode);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${shortUrl.replace(/[^a-z0-9]/gi, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download QR code:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            setIsOpen(true);
            setTimeout(generateQRCode, 100);
          }}
          variant="outline"
          size="sm"
          className="border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300"
        >
          <QrCodeIcon className="w-4 h-4 mr-1" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-purple-500/30 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">QR Code</DialogTitle>
        </DialogHeader>

        {qrCode && (
          <div className="space-y-4 py-4">
            <Card className="bg-white p-6 flex items-center justify-center">
              <img src={qrCode} alt="QR Code" className="w-64 h-64" />
            </Card>

            <div className="space-y-2">
              <p className="text-sm text-gray-300 text-center">
                <span className="font-mono text-cyan-400">{shortUrl}</span>
              </p>
              <p className="text-xs text-gray-500 text-center">
                Original: {originalUrl}
              </p>
            </div>

            <Button
              onClick={handleDownload}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download QR Code
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
