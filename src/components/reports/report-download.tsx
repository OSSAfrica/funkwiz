import { useHydrated } from "@/lib/use-hydrated";
import { useState } from "react";
import {
  ChevronDown,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportReport, type ReportFormat } from "@/lib/live/report-export";
import type { GameReport } from "@/lib/live/protocol";
export function ReportDownload({ report }: { report: GameReport }) {
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download(format: ReportFormat) {
    setBusy(true);
    setError("");
    try {
      await exportReport(report, format);
    } catch {
      setError("We couldn’t prepare that download. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="report-download">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={busy || !hydrated}>
            {busy ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {busy ? "Preparing report…" : "Download report"}
            <ChevronDown size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            Take your “aha!” moments with you.
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void download("pdf")}>
            <FileText size={17} />
            <div>
              <strong>PDF</strong>
              <small>Colorful, ready to share or print</small>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void download("csv")}>
            <FileSpreadsheet size={17} />
            <div>
              <strong>CSV</strong>
              <small>Open in Excel or Google Sheets</small>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void download("json")}>
            <FileJson size={17} />
            <div>
              <strong>JSON</strong>
              <small>Complete structured game data</small>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <span className="sr-only" role="status">
        {busy ? "Preparing your report download." : ""}
      </span>
    </div>
  );
}
