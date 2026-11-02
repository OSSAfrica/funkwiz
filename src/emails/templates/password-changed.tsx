import { Button, Section, Text } from "react-email";
import { EmailLayout } from "../components/email-layout";
import { emailButtonStyle } from "../components/email-styles";
export default function PasswordChangedEmail({
  recoveryUrl = "https://quiz.example.com/forgot-password",
}: {
  recoveryUrl?: string;
} = {}) {
  return (
    <EmailLayout
      preview="Your Fun Quiz password was updated."
      eyebrow="A QUICK ACCOUNT CHECK-IN"
      title="Fresh password. Same curious you."
    >
      <Text>Your Fun Quiz teacher password was just updated.</Text>
      <Text>
        If this was you, you’re all set. Your quizzes and classroom reports are
        still waiting for you.
      </Text>
      <Text>
        If you didn’t make this change, recover your account now using your
        private setup code or a new email recovery link.
      </Text>
      <Section style={{ margin: "28px 0" }}>
        <Button href={recoveryUrl} style={emailButtonStyle}>
          Recover my account
        </Button>
      </Section>
      <Text>
        We’ll never ask you to reply with your password or private setup code.
      </Text>
    </EmailLayout>
  );
}
PasswordChangedEmail.PreviewProps = {
  recoveryUrl: "https://quiz.example.com/forgot-password",
};
