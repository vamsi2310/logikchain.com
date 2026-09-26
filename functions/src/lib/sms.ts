import { fail } from "../errors";
import { isEmulator, smsGatewayApiKey } from "../runtime";

function apiKey(): string {
  return process.env.SMS_GATEWAY_API_KEY || smsGatewayApiKey.value();
}

async function postGateway(kind: "sms" | "voice", phone: string, message: string): Promise<void> {
  if (isEmulator() && !process.env.SMS_GATEWAY_URL) return;
  const url = process.env.SMS_GATEWAY_URL;
  if (!url) fail("UNAVAILABLE", "SMS gateway is not configured");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      channel: kind,
      to: phone,
      message,
      senderId: process.env.SMS_GATEWAY_SENDER_ID,
      entityId: process.env.SMS_GATEWAY_ENTITY_ID,
      templateId:
        kind === "voice"
          ? process.env.SMS_GATEWAY_TEMPLATE_ID_OTP
          : process.env.SMS_GATEWAY_TEMPLATE_ID_TRANSACTIONAL,
    }),
  });
  if (!response.ok) fail("UNAVAILABLE", `${kind.toUpperCase()} gateway rejected the request`);
}

export async function sendSms(phone: string, message: string): Promise<void> {
  await postGateway("sms", phone, message);
}

export async function sendVoiceOtp(phone: string, code: string): Promise<void> {
  await postGateway("voice", phone, `Your Logikchain verification code is ${code}`);
}
