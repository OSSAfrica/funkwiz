import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "./auth-layout";
import { useHydrated } from "@/lib/use-hydrated";
import { authClient } from "@/lib/auth-client";

type LoginOptions = {
  school?: boolean;
  configured: boolean;
  googleEnabled: boolean;
  registrationOpen: boolean;
};
export function SignInScreen({
  options,
  oauthError,
}: {
  options: LoginOptions;
  oauthError: boolean;
}) {
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    oauthError
      ? "Google sign-in did not complete. Try again with your teacher account, or use your password."
      : "",
  );
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email")).trim().toLowerCase();
    const password = String(fields.get("password"));
    setBusy(true);
    setError("");
    try {
      const result = setup
        ? await authClient.signUp.email(
            {
              email,
              password,
              name: String(fields.get("name")).trim(),
              callbackURL: `${location.origin}/`,
            },
            {
              headers: {
                "x-teacher-setup-code": String(fields.get("code")).trim(),
              },
            },
          )
        : await authClient.signIn.email({
            email,
            password,
            callbackURL: `${location.origin}/`,
          });
      if (result.error) {
        setError(
          result.error.message || "Sign-in did not complete. Please try again.",
        );
        return;
      }
      await router.navigate({ to: "/" });
    } catch {
      setError(
        "We couldn’t connect. Please check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function signInGoogle() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${location.origin}/`,
        errorCallbackURL: `${location.origin}/login?error=google`,
      });
      if (result.error) {
        setError(
          "Google sign-in could not start. Please try email and password.",
        );
      }
    } catch {
      setError("Google sign-in could not start. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <div className="auth-form-card reveal-in">
        <span className="auth-welcome-icon">
          {setup ? <KeyRound size={27} /> : <LockKeyhole size={27} />}
        </span>
        <div className="eyebrow">YOUR TEACHER SPACE</div>
        <h2>{setup ? "Let’s make it yours." : "Welcome back, quiz maker."}</h2>
        <p>
          {setup
            ? "Create your private teacher account. Your setup code keeps this first step just for you."
            : "Good questions are waiting. Sign in and bring a little more play to your day."}
        </p>
        {!options.configured ? (
          <div className="auth-setup-note">
            <strong>Your workspace needs its first setup.</strong>
            <p>
              Configure the teacher email, authentication URL, and private
              secrets on the server, then restart the app.
            </p>
          </div>
        ) : (
          <>
            {options.googleEnabled && (
              <>
                <Button
                  variant="outline"
                  className="google-button"
                  disabled={busy}
                  onClick={signInGoogle}
                >
                  <span className="google-letter" aria-hidden="true">
                    G
                  </span>
                  Continue with Google
                </Button>
                <div className="auth-divider">
                  <span>or use your email</span>
                </div>
              </>
            )}
            <form onSubmit={submit} className="auth-form" aria-busy={busy}>
              <CredentialFields setup={setup} busy={busy} error={error} />
            </form>
            {!setup && (
              <p className="auth-mode-switch">
                <Link to="/forgot-password">Forgot your password?</Link>
              </p>
            )}
            {options.registrationOpen && (
              <p className="auth-mode-switch">
                {setup ? "Already have your account?" : "First time here?"}
                <button
                  disabled={busy}
                  onClick={() => {
                    setSetup(!setup);
                    setError("");
                  }}
                >
                  {setup ? "Sign in" : "Set up teacher account"}
                </button>
              </p>
            )}
            {!setup && (
              <p className="auth-private-note">
                <LockKeyhole size={13} />
                {options.school
                  ? "Invited teachers can sign in here. New members should open their private invitation link."
                  : "A private workspace for your teacher account."}
              </p>
            )}
          </>
        )}
      </div>
    </AuthLayout>
  );
}

function CredentialFields({
  setup,
  busy,
  error,
}: {
  setup: boolean;
  busy: boolean;
  error: string;
}) {
  const [visible, setVisible] = useState(false);
  const hydrated = useHydrated();
  return (
    <fieldset disabled={busy || !hydrated} className="space-y-4 min-w-0">
      {setup && (
        <div className="space-y-2">
          <Label htmlFor="teacher-name">Your name</Label>
          <Input
            id="teacher-name"
            name="name"
            autoComplete="name"
            required
            maxLength={100}
            placeholder="What should we call you?"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="teacher-email">Email address</Label>
        <Input
          id="teacher-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="teacher-password">Password</Label>
        <div className="password-input">
          <Input
            id="teacher-password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete={setup ? "new-password" : "current-password"}
            required
            minLength={setup ? 12 : 1}
            maxLength={128}
            placeholder={
              setup ? "At least 12 characters" : "Your secret ingredient"
            }
          />
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      {setup && (
        <div className="space-y-2">
          <Label htmlFor="teacher-setup-code">Private setup code</Label>
          <Input
            id="teacher-setup-code"
            name="code"
            type="password"
            autoComplete="off"
            required
            placeholder="Your private teacher setup code"
          />
          <p className="auth-field-help">
            Use the code from your private server configuration.
          </p>
        </div>
      )}
      <p role="alert" className="form-error">
        {error}
      </p>
      <Button className="auth-submit" type="submit">
        {busy ? <LoaderCircle size={18} className="animate-spin" /> : null}
        {busy ? "One moment…" : setup ? "Create teacher account" : "Let’s go"}
        {!busy && <ArrowRight size={17} />}
      </Button>
    </fieldset>
  );
}
