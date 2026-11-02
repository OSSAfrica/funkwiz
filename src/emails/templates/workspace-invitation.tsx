import { Button, Text } from "react-email";
import { EmailLayout } from "../components/email-layout";
import { emailButtonStyle } from "../components/email-styles";

export default function WorkspaceInvitationEmail({
  workspace = "Science team",
  inviter = "Your colleague",
  invitationUrl = "https://quiz.example.test/accept-invite?token=example",
}: { workspace?: string; inviter?: string; invitationUrl?: string } = {}) {
  return (
    <EmailLayout
      eyebrow="YOUR TEAM IS WAITING"
      preview={`You’re invited to ${workspace} on Funkwiz.`}
      title="Good questions. Great company."
    >
      <Text>
        {inviter} invited you to join {workspace} on Funkwiz.
      </Text>
      <Text>
        Use the invited email address to create an account or sign in. This
        private invitation expires after 48 hours and can be used once.
      </Text>
      <Button href={invitationUrl} style={emailButtonStyle}>
        Join the workspace
      </Button>
      <Text>
        Workspace administrators can view all reports in their workspace. Quiz
        drafts stay private until explicitly shared.
      </Text>
      <Text>
        If you weren’t expecting this invitation, you can ignore this email.
      </Text>
    </EmailLayout>
  );
}
