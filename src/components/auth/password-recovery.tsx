import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  KeyRound,
  LoaderCircle,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";
import { AuthLayout } from "./auth-layout";

type Options = {
  school?: boolean;
  configured: boolean;
  setupCodeEnabled: boolean;
  emailEnabled: boolean;
};
function RecoveryCard({
  title,
  description,
  success = false,
  children,
}: {
  title: string;
  description: string;
  success?: boolean;
  children: ReactNode;
}) {
  return (
    <AuthLayout>
      <div className="auth-form-card reveal-in">
        <span className="auth-welcome-icon">
          {success ? <Check size={27} /> : <KeyRound size={27} />}
        </span>
        <div className="eyebrow">BACK TO THE GOOD QUESTIONS</div>
        <h2>{title}</h2>
        <p>{description}</p>
        {children}
        <p className="auth-mode-switch">
          <Link to="/login" search={{}}>
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
function PasswordFields() {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="recovery-password">New password</Label>
        <Input
          id="recovery-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          placeholder="At least 12 characters"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="recovery-confirm">Confirm new password</Label>
        <Input
          id="recovery-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
        />
      </div>
    </>
  );
}
function readPassword(fields: FormData) {
  const password = String(fields.get("password"));
  if (password !== String(fields.get("confirm")))
    throw new Error("Your passwords don’t match yet. Give them another look.");
  return password;
}
function SavedPassword() {
  return (
    <RecoveryCard
      title="Fresh password. Fresh start."
      description="Your password is saved. All existing teacher sessions have been signed out."
      success
    >
      <Button className="auth-submit" asChild>
        <Link to="/login" search={{}}>
          Sign in with your new password <ArrowRight size={17} />
        </Link>
      </Button>
    </RecoveryCard>
  );
}
function EmailSent({
  canUseSetupCode,
  onUseSetupCode,
}: {
  canUseSetupCode: boolean;
  onUseSetupCode: () => void;
}) {
  return (
    <RecoveryCard
      title="Check your inbox."
      description="If this is your teacher email, a reset link is on its way. Check your spam folder too."
      success
    >
      <p className="auth-field-help">
        The link works once and expires in 30 minutes. You can keep this page
        open or sign in after resetting.
      </p>
      {canUseSetupCode && (
        <Button
          variant="outline"
          className="w-full mt-5"
          onClick={onUseSetupCode}
        >
          Use my private setup code instead
        </Button>
      )}
    </RecoveryCard>
  );
}
export function PasswordRecovery({ options }: { options: Options }) {
  const [method, setMethod] = useState(
    options.setupCodeEnabled ? "setup" : "email",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [result, setResult] = useState<"email" | "saved" | null>(null);
  const hydrated = useHydrated();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setError("");
    setBusy(true);
    try {
      const email = String(fields.get("email")).trim().toLowerCase();
      const response =
        method === "email"
          ? await authClient.$fetch("/request-teacher-password-reset", {
              method: "POST",
              body: { email },
            })
          : await authClient.$fetch("/reset-with-setup-code", {
              method: "POST",
              body: {
                email,
                setupCode: String(fields.get("code")).trim(),
                newPassword: readPassword(fields),
              },
            });
      if (response.error)
        throw new Error(
          response.error.message ||
            "Your password could not be reset. Please try again.",
        );
      setResult(method === "email" ? "email" : "saved");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (result === "saved") return <SavedPassword />;
  if (result === "email")
    return (
      <EmailSent
        canUseSetupCode={options.setupCodeEnabled}
        onUseSetupCode={() => {
          setResult(null);
          setMethod("setup");
        }}
      />
    );
  return (
    <RecoveryCard
      title="Let’s get you back in."
      description={
        options.school
          ? "Teachers recover by email. The private setup code is only for the installation owner."
          : "Use your private setup code, or ask for a password reset link by email."
      }
    >
      {!options.configured ||
      (!options.setupCodeEnabled && !options.emailEnabled) ? (
        <p className="auth-setup-note">
          Password recovery needs to be configured for this workspace.
        </p>
      ) : (
        <>
          <Tabs
            value={method}
            onValueChange={(value) => {
              setMethod(value);
              setError("");
            }}
          >
            <TabsList className="grid w-full grid-cols-2 mb-5">
              <TabsTrigger
                value="setup"
                className="gap-1.5 px-2 text-xs sm:text-sm"
                disabled={busy || !options.setupCodeEnabled}
              >
                <KeyRound size={15} />
                Private setup code
              </TabsTrigger>
              <TabsTrigger
                value="email"
                className="gap-1.5 px-2 text-xs sm:text-sm"
                disabled={busy || !options.emailEnabled}
              >
                <Mail size={15} />
                Email link
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {!options.emailEnabled && (
            <p className="auth-field-help mb-5">
              Email reset is available once email sending is configured. You can
              use your private setup code now.
            </p>
          )}
          <form className="auth-form" onSubmit={submit} aria-busy={busy}>
            <fieldset
              disabled={busy || !hydrated}
              className="space-y-4 min-w-0"
            >
              <div className="space-y-2">
                <Label htmlFor="recovery-email">Teacher email</Label>
                <Input
                  id="recovery-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                  placeholder="you@example.com"
                />
              </div>
              {method === "setup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="recovery-code">Private setup code</Label>
                    <Input
                      id="recovery-code"
                      name="code"
                      type="password"
                      autoComplete="off"
                      required
                      maxLength={256}
                    />
                    <p className="auth-field-help">
                      Use your private teacher setup code, not a student game
                      code.
                    </p>
                  </div>
                  <PasswordFields />
                  <p className="auth-field-help">
                    Resetting signs out all existing teacher sessions.
                  </p>
                </>
              )}
              <p role="alert" className="form-error">
                {error}
              </p>
              <Button className="auth-submit" type="submit">
                {busy && <LoaderCircle size={18} className="animate-spin" />}
                {busy
                  ? "One moment…"
                  : method === "setup"
                    ? "Reset password"
                    : "Send reset link"}
              </Button>
            </fieldset>
          </form>
        </>
      )}
    </RecoveryCard>
  );
}
export function ResetPasswordScreen({
  token,
  invalid,
}: {
  token?: string;
  invalid: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const hydrated = useHydrated(),
    navigate = useNavigate();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setError("");
    setBusy(true);
    try {
      const response = await authClient.resetPassword({
        token,
        newPassword: readPassword(fields),
      });
      if (response.error)
        throw new Error(
          "This reset link is invalid, expired, or already used. Request a fresh link.",
        );
      setSaved(true);
      await navigate({ to: "/reset-password", search: {}, replace: true });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (saved) return <SavedPassword />;
  if (invalid || !token)
    return (
      <RecoveryCard
        title="Let’s try a fresh link."
        description="This reset link is missing or no longer valid."
      >
        <Button className="auth-submit" asChild>
          <Link to="/forgot-password">
            Get a new reset link <ArrowRight size={17} />
          </Link>
        </Button>
      </RecoveryCard>
    );
  return (
    <RecoveryCard
      title="A fresh start awaits."
      description="Choose a new password with 12–128 characters. This will sign out all existing teacher sessions."
    >
      <form className="auth-form" onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy || !hydrated} className="space-y-4 min-w-0">
          <PasswordFields />
          <p role="alert" className="form-error">
            {error}
          </p>
          <Button className="auth-submit" type="submit">
            {busy && <LoaderCircle size={18} className="animate-spin" />}
            {busy ? "Saving…" : "Save new password"}
          </Button>
        </fieldset>
      </form>
    </RecoveryCard>
  );
}
