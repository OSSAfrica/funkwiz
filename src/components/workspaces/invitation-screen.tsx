import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Users } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";
import {
  acceptWorkspaceInvitation,
  type getWorkspaceInvitation,
} from "@/lib/workspaces.functions";

export function WorkspaceInvitationScreen({
  invitation,
  teacher,
  token,
  googleEnabled,
}: {
  invitation: Awaited<ReturnType<typeof getWorkspaceInvitation>>;
  teacher: { email: string; name: string } | null;
  token: string;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function accept() {
    await acceptWorkspaceInvitation({ data: token });
    history.replaceState(null, "", "/accept-invite");
    await router.navigate({ to: "/" });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitation) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (!teacher) {
        const password = String(fields.get("password") ?? "");
        const result = invitation.registered
          ? await authClient.signIn.email({ email: invitation.email, password })
          : await authClient.signUp.email(
              {
                email: invitation.email,
                password,
                name: String(fields.get("name") ?? "").trim(),
              },
              { headers: { "x-workspace-invitation": token } },
            );
        if (result.error)
          throw new Error(result.error.message || "Sign-in did not complete.");
      }
      await accept();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The invitation could not be accepted. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <div className="auth-form-card reveal-in">
        <div className="auth-card-copy">
          <span className="eyebrow">GOOD QUESTIONS. GREAT COMPANY.</span>
          <h2>
            {invitation
              ? `Join ${invitation.workspace}`
              : "A fresh invitation, please."}
          </h2>
          <p>
            {invitation
              ? "A place for your team’s next aha! moment."
              : "This invitation is expired, revoked or already used. Ask a workspace Admin for a new link."}
          </p>
        </div>
        {!invitation ? (
          <Link to="/login" search={{}} className="text-primary underline">
            Back to sign in
          </Link>
        ) : (
          <>
            <div className="mb-5 rounded-xl bg-secondary/60 p-4 text-sm">
              <Users size={20} className="mb-2" />
              <p>
                You’re invited as{" "}
                {invitation.role === "admin" ? "an Admin" : "a Teacher"} using{" "}
                <strong className="break-all">{invitation.email}</strong>.
              </p>
              <p className="mt-2">
                {invitation.registered
                  ? "Sign in to accept this invitation. No setup code is needed."
                  : "This invitation link authorizes your signup. You do not need an administrator setup code."}
              </p>
              <p className="mt-2">
                Drafts stay private until shared. Workspace Admins and Owners
                can view all reports in this workspace.
              </p>
            </div>
            {teacher && teacher.email !== invitation.email ? (
              <div className="space-y-3">
                <p>Sign out of {teacher.email} and use the invited account.</p>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    await authClient.signOut();
                    await router.invalidate();
                  }}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <fieldset disabled={busy || !hydrated} className="space-y-4">
                  {!teacher && (
                    <>
                      {!invitation.registered && (
                        <div className="space-y-2">
                          <Label htmlFor="invited-name">Your name</Label>
                          <Input
                            id="invited-name"
                            name="name"
                            required
                            maxLength={100}
                            autoComplete="name"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="invited-password">
                          {invitation.registered
                            ? "Password"
                            : "Choose a password"}
                        </Label>
                        <Input
                          id="invited-password"
                          type="password"
                          name="password"
                          required
                          minLength={invitation.registered ? undefined : 12}
                          maxLength={128}
                          autoComplete={
                            invitation.registered
                              ? "current-password"
                              : "new-password"
                          }
                        />
                      </div>
                    </>
                  )}
                  <Button type="submit" className="w-full">
                    {busy
                      ? "Joining…"
                      : teacher
                        ? "Accept invitation"
                        : invitation.registered
                          ? "Sign in and join workspace"
                          : "Create account and join workspace"}
                    <ArrowRight size={17} />
                  </Button>
                </fieldset>
              </form>
            )}
            {!teacher && googleEnabled && (
              <Button
                variant="outline"
                className="mt-3 w-full"
                disabled={busy || !hydrated}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const result = await authClient.signIn.social({
                      provider: "google",
                      callbackURL: location.href,
                      errorCallbackURL: `${location.origin}/login?error=google`,
                    });
                    if (result.error)
                      throw new Error("Google sign-in did not complete.");
                  } catch {
                    setError("Google sign-in did not complete. Try again.");
                    setBusy(false);
                  }
                }}
              >
                Continue with Google
              </Button>
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </AuthLayout>
  );
}
