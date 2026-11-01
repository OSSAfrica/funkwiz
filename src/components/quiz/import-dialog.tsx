import { useRef, useState } from "react";
import { ArrowRight, FileJson, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { importExample, parseImport, type Quiz } from "@/lib/quiz";

export function ImportDialog({ onReview }: { onReview: (quiz: Quiz) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <span className="dialog-icon">
          <FileJson />
        </span>
        <DialogTitle>More questions. Less typing.</DialogTitle>
        <DialogDescription>
          Paste JSON from your AI tool or upload a file. You’ll review every
          question before saving.
        </DialogDescription>
      </DialogHeader>
      <div className="dialog-scroll space-y-4">
        <div className="import-format">
          <strong>The recipe for a great import</strong>
          <p>
            A title and a questions list. Each question needs a prompt, four
            answers, a correctIndex (0–3), and an optional duration in seconds.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setText(importExample);
              setError("");
            }}
          >
            Use example JSON
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="import-json">Your quiz JSON</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => file.current?.click()}
          >
            <Upload size={15} />
            Upload .json
          </Button>
        </div>
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          aria-label="Upload quiz JSON"
          onChange={async (e) => {
            const selected = e.target.files?.[0];
            if (!selected) return;
            if (selected.size > 500_000) {
              setError("Keep your file under 500 KB.");
              return;
            }
            try {
              setText(await selected.text());
              setError("");
            } catch {
              setError(
                "That file could not be read. Try pasting the JSON instead.",
              );
            }
            e.target.value = "";
          }}
        />
        <Textarea
          id="import-json"
          className="min-h-64 font-mono text-xs"
          placeholder={
            '{\n  "title": "My brilliant quiz",\n  "questions": [...]\n}'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Up to 100 questions · JSON only for now · Nothing is uploaded to a
          server
        </p>
      </div>
      <div className="dialog-footer">
        <p className="form-error" role="alert">
          {error}
        </p>
        <Button
          disabled={!text.trim()}
          onClick={() => {
            try {
              onReview(parseImport(text));
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Review questions
          <ArrowRight size={16} />
        </Button>
      </div>
    </DialogContent>
  );
}
