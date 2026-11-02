import { Button, Link, Section, Text } from "react-email";
import { EmailLayout } from "../components/email-layout";
import { emailButtonStyle } from "../components/email-styles";
export default function PasswordResetEmail({
  resetUrl = "https://quiz.example.com/reset-password?token=preview-only",
}: { resetUrl?: string } = {}) {
  return (
    <EmailLayout
      preview="Your link to a fresh Funkwiz password. Expires in 30 minutes."
      eyebrow="A FRESH START"
      title="Back to the good questions."
    >
      <Text>Choose a fresh password and get back to your classroom.</Text>
      <Section style={{ margin: "28px 0" }}>
        <Button href={resetUrl} style={emailButtonStyle}>
          Reset my password
        </Button>
      </Section>
      <Text>
        This link expires in 30 minutes and works once. Resetting your password
        signs out existing teacher sessions.
      </Text>
      <Text>If the button doesn’t work, open this link:</Text>
      <Link
        href={resetUrl}
        style={{ color: "#376a51", fontSize: "12px", wordBreak: "break-all" }}
      >
        {resetUrl}
      </Link>
      <Text>
        If you didn’t request this, you can ignore this email. Your password has
        not changed.
      </Text>
    </EmailLayout>
  );
}
PasswordResetEmail.PreviewProps = {
  resetUrl: "https://quiz.example.com/reset-password?token=preview-only",
};
