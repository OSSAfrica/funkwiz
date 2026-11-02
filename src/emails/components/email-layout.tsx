import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";

import { emailColors } from "./email-styles";

export function EmailLayout({
  preview,
  eyebrow,
  title,
  children,
}: {
  preview: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#f1f0e9",
          fontFamily: "'Trebuchet MS', Arial, sans-serif",
          margin: 0,
          padding: "32px 12px",
          color: emailColors.forest,
        }}
      >
        <Container
          style={{
            maxWidth: "560px",
            backgroundColor: emailColors.cream,
            borderRadius: "20px",
            overflow: "hidden",
          }}
        >
          <Section
            style={{
              backgroundColor: emailColors.forest,
              padding: "28px 32px",
            }}
          >
            <Text
              style={{
                margin: 0,
                color: emailColors.gold,
                fontSize: "30px",
                fontWeight: 800,
              }}
            >
              funquiz.
            </Text>
            <Text
              style={{ margin: "8px 0 0", color: "#d6e5a7", fontSize: "12px" }}
            >
              A little curiosity. A lot of fun.
            </Text>
          </Section>
          <Section style={{ padding: "32px" }}>
            <Text
              style={{
                color: "#88601e",
                fontSize: "11px",
                letterSpacing: "1.4px",
                fontWeight: 700,
              }}
            >
              {eyebrow}
            </Text>
            <Heading
              style={{
                fontSize: "30px",
                lineHeight: "36px",
                margin: "14px 0 20px",
              }}
            >
              {title}
            </Heading>
            {children}
            <Hr style={{ borderColor: "#e7e8df", margin: "30px 0 20px" }} />
            <Text
              style={{
                color: emailColors.muted,
                fontSize: "12px",
                lineHeight: "20px",
              }}
            >
              Made for curious minds &amp; happy classrooms.
              <br />
              This is an account notification from your Fun Quiz workspace.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
