import { useRef, useState } from "react";
import {
  KeyRound,
  LoaderCircle,
  LogOut,
  Mail,
  Settings2,
  UserRound,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { signOutTeacher } from "@/lib/sign-out";

export type AccountSection = "account" | "password" | "email";

export function AccountMenu({
  teacher,
  hasPassword,
  canManageEmail,
  onSettings,
}: {
  teacher: { name: string; email: string };
  hasPassword: boolean;
  canManageEmail: boolean;
  onSettings: (section: AccountSection) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cancel = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const openingSettings = useRef(false);
  function settings(section: AccountSection) {
    openingSettings.current = true;
    onSettings(section);
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await signOutTeacher();
    } catch {
      setError(
        "We couldn’t sign you out. Check your connection and try again.",
      );
      setBusy(false);
    }
  }
  return (
    <>
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) openingSettings.current = false;
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            variant="ghost"
            size="icon"
            aria-label="Teacher account"
            title="Teacher account"
          >
            <UserRound aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64"
          onCloseAutoFocus={(event) => {
            if (confirm || openingSettings.current) event.preventDefault();
          }}
        >
          <DropdownMenuLabel>
            <span className="block truncate">{teacher.name}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {teacher.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => settings("account")}>
            <Settings2 aria-hidden="true" />
            Account settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => settings("password")}>
            <KeyRound aria-hidden="true" />
            {hasPassword ? "Change password" : "Set up password"}
          </DropdownMenuItem>
          {canManageEmail && (
            <DropdownMenuItem onSelect={() => settings("email")}>
              <Mail aria-hidden="true" />
              Email delivery
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="sign-out-raised mx-1 mb-2 mt-1"
            onSelect={() => {
              setError("");
              setConfirm(true);
            }}
          >
            <LogOut aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={confirm}
        onOpenChange={(open) => {
          if (!busy) setConfirm(open);
        }}
      >
        <DialogContent
          role="alertdialog"
          className="sm:max-w-md"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancel.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Sign out of Funkwiz?</DialogTitle>
            <DialogDescription>
              You’ll return to the sign-in page. Your saved quizzes and reports
              will stay in your account.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="gap-3">
            <Button
              ref={cancel}
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Stay signed in
            </Button>
            <Button
              className="sign-out-raised"
              variant="destructive"
              disabled={busy}
              aria-busy={busy}
              onClick={signOut}
            >
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <LogOut aria-hidden="true" />
              )}
              {busy ? "Signing out…" : "Sign out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
