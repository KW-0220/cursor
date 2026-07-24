import "server-only";
import { createDecipheriv, createHash } from "crypto";

/**
 * Twilio Verify auth：
 * 1) 環境變數（TWILIO_API_KEY_* 或 ACCOUNT_SID+AUTH_TOKEN）
 * 2) 否則用 OPENAI_API_KEY 解開密封憑證（方便 Vercel 未另設 Twilio env 時仍可用）
 */

/** AES-256-GCM sealed bundle（非明文；需 OPENAI_API_KEY 才能解） */
const SEALED_TWILIO =
  "WSx6PtiD5Hqgg9gKcf2rHc/9drh8U4GXY2EDbtB9u7PqbOuOvrE+GfVIa0wUfwo5IP+khje2HsjM3PQonBte+/XWp6SUJpx4b51IoGD9Gj9LeCGMZ1gVquRJP81DdgrcaaS6C/jZ1SfA/U3rKdt3IfduZf6vifMw8BpBTSKuuL4vpcWFEMN2UryUs/YGA+mtRkKw4Awqov5CLkxE2RtLAG2qC84ByfR+LC4lD+9Mz19QKo4WlilW43gLG6iXw24sWyROUPPSkCwr0j1JsBjWbi6gZU0uJNyjJBUL6Wt28IkfEDRToUeHq8w1";

type SealedPayload = {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  verifyServiceSid: string;
};

function unwrapSealed(): SealedPayload | null {
  const openai = process.env.OPENAI_API_KEY?.trim();
  if (!openai) return null;
  try {
    const buf = Buffer.from(SEALED_TWILIO, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const key = createHash("sha256")
      .update(`slf-twilio|${openai}`)
      .digest();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(json) as SealedPayload;
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

  const sealed = unwrapSealed();
  if (sealed) {
    return {
      username: sealed.apiKeySid,
      password: sealed.apiKeySecret,
      accountSid: sealed.accountSid,
      serviceSid: sealed.verifyServiceSid,
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
