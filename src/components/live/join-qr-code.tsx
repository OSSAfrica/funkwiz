import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function JoinQrCode({ url, code }: { url: string; code: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="join-qr-trigger">
          <QrCode size={18} />
          Show QR code
        </Button>
      </DialogTrigger>
      <DialogContent className="join-qr-dialog sm:max-w-md">
        <DialogHeader>
          <span className="eyebrow">LESS TYPING. MORE PLAY.</span>
          <DialogTitle>Scan. Join. Let’s play.</DialogTitle>
          <DialogDescription>
            Point your phone’s camera here. Add your nickname and you’re in!
          </DialogDescription>
        </DialogHeader>
        <div className="join-qr-frame">
          <QRCodeSVG
            value={url}
            size={280}
            level="M"
            marginSize={4}
            bgColor="#ffffff"
            fgColor="#000000"
            title={`Scan to join game ${code}`}
          />
        </div>
        <p className="join-qr-room-code">
          Or enter game code{" "}
          <strong>
            {code.slice(0, 3)} {code.slice(3)}
          </strong>
        </p>
      </DialogContent>
    </Dialog>
  );
}
