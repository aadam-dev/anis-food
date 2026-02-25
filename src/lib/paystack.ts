import crypto from "crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

interface PaystackInitializePayload {
  email: string;
  amount: number;
  reference: string;
  callback_url: string;
  metadata?: Record<string, unknown>;
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    status: string;
    amount: number;
    currency: string;
    reference: string;
    channel?: string;
    paid_at?: string;
    customer?: {
      email?: string;
    };
    metadata?: Record<string, unknown>;
  };
}

function getPaystackSecret(): string {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error("Paystack secret key is not configured.");
  }
  return secret;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 10000): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Paystack request timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function generatePaystackReference(prefix = "anis"): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
}

export function verifyPaystackSignature(rawBody: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha512", getPaystackSecret())
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

export async function initializePaystackTransaction(
  payload: PaystackInitializePayload
): Promise<{ authorizationUrl: string; accessCode: string; reference: string }> {
  const secret = getPaystackSecret();
  const response = await withTimeout(
    fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  );

  const body = (await response.json()) as PaystackInitializeResponse;
  if (!response.ok || !body.status || !body.data) {
    throw new Error(body.message || "Failed to initialize Paystack transaction.");
  }

  return {
    authorizationUrl: body.data.authorization_url,
    accessCode: body.data.access_code,
    reference: body.data.reference,
  };
}

export async function verifyPaystackTransaction(reference: string): Promise<{
  status: string;
  amount: number;
  currency: string;
  reference: string;
  channel?: string;
  paidAt?: string;
  customerEmail?: string;
  metadata?: Record<string, unknown>;
}> {
  const secret = getPaystackSecret();
  const response = await withTimeout(
    fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    })
  );

  const body = (await response.json()) as PaystackVerifyResponse;
  if (!response.ok || !body.status || !body.data) {
    throw new Error(body.message || "Failed to verify Paystack transaction.");
  }

  return {
    status: body.data.status,
    amount: body.data.amount,
    currency: body.data.currency,
    reference: body.data.reference,
    channel: body.data.channel,
    paidAt: body.data.paid_at,
    customerEmail: body.data.customer?.email,
    metadata: body.data.metadata,
  };
}
