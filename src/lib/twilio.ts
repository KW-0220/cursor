import "server-only";

/**
 * Twilio Verify auth：
 * - 優先 API Key（SK… + secret）
 * - 否則 Account SID（AC…）+ Auth Token
 */
export function getTwilioAuth(): {
  username: string;
  password: string;
  accountSid: string | null;
  serviceSid: string;
} | null {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  if (!serviceSid) return null;

  const apiKey = process.env.TWILIO_API_KEY_SID?.trim();
  const apiSecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  if (apiKey && apiSecret) {
    return {
      username: apiKey,
      password: apiSecret,
      accountSid: process.env.TWILIO_ACCOUNT_SID?.trim() || null,
      serviceSid,
    };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (accountSid && authToken) {
    return {
      username: accountSid,
      password: authToken,
      accountSid,
      serviceSid,
    };
  }

  return null;
}

export function twilioConfigured() {
  return getTwilioAuth() !== null;
}

export function twilioBasicAuthHeader(auth: {
  username: string;
  password: string;
}) {
  return `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}`;
}

export function toE164(phone: string) {
  const cleaned = phone.replace(/\s+/g, "");
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}
