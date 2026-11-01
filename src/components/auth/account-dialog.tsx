import { useState, type FormEvent } from "react";
import { Check, LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import { addPassword } from "@/lib/auth.functions";

type Teacher = { name: string; email: string };
export function AccountDialog({
  open,
  onOpenChange,
  teacher,
  hasPassword,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher;
  hasPassword: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const newPassword = String(fields.get("newPassword"));
    if (newPassword !== String(fields.get("confirmPassword"))) {
      setError("Those passwords don’t match yet.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      if (hasPassword) {
        const result = await authClient.changePassword({
          currentPassword: String(fields.get("currentPassword")),
          newPassword,
          revokeOtherSessions: true,
        });
        if (result.error) {
          setError(
            result.error.message || "Your password could not be changed.",
          );
          return;
        }
      } else {
        await addPassword({ data: { password: newPassword } });
      }
      setSaved(true);
      (event.target as HTMLFormElement).reset();
      await router.invalidate();
    } catch {
      setError(
        "Your password could not be saved. Please sign in again and retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign out failed");
      await router.navigate({ to: "/login", search: {} });
    } catch {
      setError("We couldn’t sign you out. Please try again.");
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>A space that’s all yours.</DialogTitle>
          <DialogDescription>
            {teacher.name} · {teacher.email}
          </DialogDescription>
        </DialogHeader>
        <div className="dialog-scroll">
          <form onSubmit={submit}>
            <fieldset disabled={busy} className="space-y-4">
              <h3 className="text-sm font-bold">
                {hasPassword
                  ? "Change your password"
                  : "Add email and password sign-in"}
              </h3>
              {hasPassword && (
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use 12–128 characters. Keep your password unique to this
                account.
              </p>
              <p className="form-error" role="alert">
                {error}
              </p>
              {saved && (
                <p
                  className="flex items-center gap-2 text-sm text-green-800"
                  role="status"
                >
                  <Check size={16} />
                  Password saved.
                </p>
              )}
              <Button type="submit">
                {busy && <LoaderCircle size={16} className="animate-spin" />}
                Save password
              </Button>
            </fieldset>
          </form>
          <div className="mt-6 border-t pt-4">
            <Button variant="outline" disabled={busy} onClick={signOut}>
              <LogOut size={16} />
              Sign out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
