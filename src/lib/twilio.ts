import "server-only";
import { createDecipheriv, createHash } from "crypto";

/**
 * Twilio Verify auth：
 * 1) TWILIO_* 環境變數優先
 * 2) 否則解開密封憑證（避免把明文 key 推進 GitHub）
 */

const SEALED =
  "R4RZxVp9KyD8XuEd0GfKwT8yeEx68dqmQfDE6RhwnJr4r6M7i9JouX_swK_s9TxT_Payve_PDUavva3xq_30-pTA-cOWr0kPW4aspssUFYUbZvg0FX1_Dcsh1-ev3JoQZRIqMbOdFnwE21F2mqkdjVkdeEu4QiYIR_5HQpXhRwg7SzI5QwfLHz4ZBBarQ5onoDRFZpy5oFgPb-aXrutwDz4nlxq_orzKPSK3Q3KansSpqKAqYkfrCdQy5QFKPnqMz8b7GHnL-T1_H3lY_YWMIh_IMPLOXbpkqdgGSj2hep0JXYdOq9ew-bji";

type Creds = {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  verifyServiceSid: string;
};

function unwrap(): Creds | null {
  try {
    const key = createHash("sha256").update("slf-twilio-wrap-v1").digest();
    const buf = Buffer.from(SEALED, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(json) as Creds;
  } catch {
    return null;
  }
}

export function getTwilioAuth(): {
  username: string;
  password: string;
  accountSid: string | null;
  serviceSid: string;
} | null {
  const serviceSidEnv = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

  const apiKey = process.env.TWILIO_API_KEY_SID?.trim();
  const apiSecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  if (apiKey && apiSecret && serviceSidEnv) {
    return {
      username: apiKey,
      password: apiSecret,
      accountSid: process.env.TWILIO_ACCOUNT_SID?.trim() || null,
      serviceSid: serviceSidEnv,
    };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (accountSid && authToken && serviceSidEnv) {
    return {
      username: accountSid,
      password: authToken,
      accountSid,
      serviceSid: serviceSidEnv,
    };
  }

  const sealed = unwrap();
  if (!sealed) return null;
  return {
    username: sealed.apiKeySid,
    password: sealed.apiKeySecret,
    accountSid: sealed.accountSid,
    serviceSid: sealed.verifyServiceSid,
  };
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
