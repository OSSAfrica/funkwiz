import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Check, LoaderCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getEmailDeliverySettings,
  saveEmailProvider,
} from "@/lib/email.functions";
import { isEmailProvider, type EmailProvider } from "@/lib/email-provider";
import { useHydrated } from "@/lib/use-hydrated";

type Settings = Awaited<ReturnType<typeof getEmailDeliverySettings>>;
export function EmailDeliveryForm({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [provider, setProvider] = useState<EmailProvider | "">(
    initial.provider ?? "",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const hydrated = useHydrated();
  const router = useRouter();
  const selected = settings.options.find((option) => option.id === provider);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isEmailProvider(provider)) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      setSettings(await saveEmailProvider({ data: provider }));
      await router.invalidate().catch(() => {});
      setSaved(true);
    } catch {
      setError(
        "Your email provider could not be saved. Check your connection and sign-in, then retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="mt-6 border-t pt-5"
      aria-label="Password reset email settings"
    >
      <fieldset disabled={busy || !hydrated} className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Mail size={17} />
          Password reset email
        </h3>
        <p className="text-xs text-muted-foreground">
          Choose how this workspace sends recovery links. Your selection is
          saved to your teacher account.
        </p>
        <div className="space-y-2">
          <Label htmlFor="email-delivery-provider">Email provider</Label>
          <Select
            value={provider}
            onValueChange={(value) => {
              if (isEmailProvider(value)) {
                setProvider(value);
                setSaved(false);
                setError("");
              }
            }}
            disabled={busy || !hydrated}
            required
          >
            <SelectTrigger id="email-delivery-provider" className="h-10">
              <SelectValue placeholder="Choose a provider" />
            </SelectTrigger>
            <SelectContent>
              {settings.options.map((option) => (
                <SelectItem value={option.id} key={option.id}>
                  {option.label}
                  {option.configured ? "" : " (setup required)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          {selected?.configured
            ? `Configured sender: ${settings.sender}.`
            : "Email recovery stays unavailable until this provider’s server setup is complete. Keep your private setup code available."}
        </p>
        <p className="text-xs text-muted-foreground">
          API keys, mailbox passwords, and sender verification are managed in
          your private server configuration.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p
            className="flex items-center gap-2 text-sm text-green-800"
            role="status"
          >
            <Check size={16} />
            Email provider saved.
          </p>
        )}
        <Button
          type="submit"
          variant="outline"
          disabled={!provider || busy || provider === settings.provider}
        >
          {busy && <LoaderCircle size={16} className="animate-spin" />}Save
          email provider
        </Button>
      </fieldset>
    </form>
  );
}
