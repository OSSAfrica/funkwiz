import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { quizAiPrompt } from "@/lib/quiz-ai-prompt";

export function AiPromptPanel() {
  const prompt = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(quizAiPrompt);
      setCopied(true);
      setMessage(
        "Prompt copied. Paste it into your AI tool and replace the bracketed instructions.",
      );
    } catch {
      prompt.current?.focus();
      prompt.current?.select();
      setCopied(false);
      setMessage(
        "Automatic copying is unavailable. The prompt is selected so you can copy it manually.",
      );
    }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Copy this prompt into your AI tool. Add your topic, or attach/paste a
        document there. Set the audience, question count and timing, then bring
        the generated JSON back to <strong>Import JSON</strong>.
      </p>
      <Button variant="outline" onClick={() => void copy()}>
        {copied ? <Check size={16} /> : <Copy size={16} />}Copy AI prompt
      </Button>
      <p className="text-sm" role="status">
        {message}
      </p>
      <Label htmlFor="quiz-ai-prompt">AI prompt with example JSON</Label>
      <Textarea
        ref={prompt}
        id="quiz-ai-prompt"
        value={quizAiPrompt}
        readOnly
        className="h-64 font-mono text-xs"
      />
      <p className="text-xs text-muted-foreground">
        This copies instructions only. Funkwiz does not send your topic or
        document to an AI service. Review the generated questions and correct
        answers before saving.
      </p>
    </div>
  );
}
