import { render, toPlainText } from "react-email";
import PasswordResetEmail from "./templates/password-reset";
import PasswordChangedEmail from "./templates/password-changed";
import WelcomeEmail from "./templates/welcome";
import WorkspaceInvitationEmail from "./templates/workspace-invitation";

export type AccountEmail =
  | { kind: "password-reset"; resetUrl: string }
  | { kind: "password-changed"; recoveryUrl: string }
  | {
      kind: "workspace-invitation";
      invitationUrl: string;
      workspace: string;
      inviter: string;
    }
  | {
      kind: "welcome";
      name: string;
      workspaceUrl: string;
      setupCodeRecovery?: boolean;
    };
export async function renderAccountEmail(email: AccountEmail) {
  const element =
    email.kind === "workspace-invitation" ? (
      <WorkspaceInvitationEmail
        invitationUrl={email.invitationUrl}
        workspace={email.workspace}
        inviter={email.inviter}
      />
    ) : email.kind === "password-reset" ? (
      <PasswordResetEmail resetUrl={email.resetUrl} />
    ) : email.kind === "password-changed" ? (
      <PasswordChangedEmail recoveryUrl={email.recoveryUrl} />
    ) : (
      <WelcomeEmail
        name={email.name}
        workspaceUrl={email.workspaceUrl}
        setupCodeRecovery={email.setupCodeRecovery}
      />
    );
  const html = await render(element);
  return {
    subject:
      email.kind === "workspace-invitation"
        ? "You’re invited to a Funkwiz workspace"
        : email.kind === "password-reset"
          ? "Reset your Funkwiz password"
          : email.kind === "password-changed"
            ? "Your Funkwiz password was updated"
            : "Welcome to your Funkwiz classroom",
    html,
    text: toPlainText(html),
  };
}
