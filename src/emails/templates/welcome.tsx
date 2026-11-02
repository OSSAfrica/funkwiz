import { Button, Section, Text } from "react-email";
import { EmailLayout } from "../components/email-layout";
import { emailButtonStyle } from "../components/email-styles";
export default function WelcomeEmail({
  name = "Curious Teacher",
  workspaceUrl = "https://quiz.example.com",
}: {
  name?: string;
  workspaceUrl?: string;
} = {}) {
  return (
    <EmailLayout
      preview="Your teacher workspace is ready for its first aha!"
      eyebrow="YOUR NEXT GREAT CLASS STARTS HERE"
      title="Hello, maker of “aha!” moments."
    >
      <Text>Welcome, {name}! Your Funkwiz teacher account is ready.</Text>
      <Text>
        Start with an example, bring your own questions, or invite your
        classroom into a live game. You set the pace; we bring the play.
      </Text>
      <Section style={{ margin: "28px 0" }}>
        <Button href={workspaceUrl} style={emailButtonStyle}>
          Meet my workspace
        </Button>
      </Section>
      <Text>
        Keep your private teacher setup code somewhere safe. It can help you
        recover your account, and should never be shared with students.
      </Text>
    </EmailLayout>
  );
}
WelcomeEmail.PreviewProps = {
  name: "Curious Teacher",
  workspaceUrl: "https://quiz.example.com",
};
