import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { database, requireTeacher } from "./auth.server";
import { emailDeliverySettings } from "@/db/schema";
import { emailDeliveryOptions } from "./email-settings.server";
import { isTeacher } from "./auth-policy";
import { isEmailProvider } from "./email-provider";

export const getEmailDeliverySettings = createServerFn({
  method: "GET",
}).handler(async () => {
  const teacher = await requireTeacher(getRequestHeaders());
  return {
    ...(await emailDeliveryOptions(env)),
    canManage: isTeacher(teacher.email, env),
  };
});
export const saveEmailProvider = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    if (!isEmailProvider(value))
      throw new Error("Choose Resend, Cloudflare Email, or an SMTP service.");
    return value;
  })
  .handler(async ({ data }) => {
    const teacher = await requireTeacher(getRequestHeaders());
    if (!isTeacher(teacher.email, env))
      throw new Error("Email delivery is managed by the installation owner.");
    await database()
      .insert(emailDeliverySettings)
      .values({ ownerId: teacher.id, provider: data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: emailDeliverySettings.ownerId,
        set: { provider: data, updatedAt: new Date() },
      });
    return { ...(await emailDeliveryOptions(env)), canManage: true };
  });
