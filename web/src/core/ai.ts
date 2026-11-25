import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, Schema } from "firebase/ai";
import { CATEGORIES } from "./categories";
import { normalizeDate } from "./deadlines";
import { getFirebaseApp, isFirebaseConfigured } from "./firebase";
import type { PreparedImage } from "./image";
import type { AiResult, AiStage, ExtractedFields } from "./types";
import { rejectReason } from "./validate";

/** False until the Firebase keys are put in web/.env. The app then falls back to Manual entry. */
export const isAiConfigured = isFirebaseConfigured;

const PROMPT = `You are reading a photo of a retail receipt. Return only JSON that matches the schema.
- itemName: a short name for the main or most expensive item bought.
- merchant: the store or seller name.
- purchaseDate: the purchase date as YYYY-MM-DD. Receipts usually print day/month/year (for example 03/10/26 is 3 October 2026, which you write as 2026-10-03). Ignore the time.
- total: the final total paid, as a number without a currency symbol.
- currency: the currency code (for example MYR, USD) or symbol.
- warrantyMonths: ONLY if a warranty length is printed on the receipt (for example "1 year warranty" is 12). Otherwise leave it out. Never guess.
- policyText: any printed return or warranty policy text, copied as written. Leave it out if there is none.
- category: exactly one of: ${CATEGORIES.join(", ")}.
- isSubscription: true ONLY if the receipt is for a recurring subscription or membership (for example a gym, streaming or software plan). Leave it out otherwise.
If a value is unreadable, leave optional fields out and do your best on the required ones.`;

const receiptSchema = Schema.object({
  properties: {
    itemName: Schema.string(),
    merchant: Schema.string(),
    purchaseDate: Schema.string(),
    total: Schema.number(),
    currency: Schema.string(),
    warrantyMonths: Schema.number(),
    policyText: Schema.string(),
    category: Schema.string(),
    isSubscription: Schema.boolean(),
  },
  optionalProperties: ["warrantyMonths", "policyText", "category", "isSubscription"],
});

/** The SDK's default cloud model for hybrid inference (Firebase AI Logic Web SDK v13+). */
const CLOUD_MODEL = "gemini-3.5-flash-lite";

let cachedModels: ReturnType<typeof createModels> | null = null;

function createModels() {
  // getFirebaseApp() sets up App Check first, which Firebase AI Logic requires.
  const ai = getAI(getFirebaseApp(), { backend: new GoogleAIBackend() });

  const shared = {
    onDeviceParams: {
      createOptions: { expectedInputs: [{ type: "text" as const }, { type: "image" as const }] },
      promptOptions: { responseConstraint: receiptSchema },
    },
    inCloudParams: {
      model: CLOUD_MODEL,
      generationConfig: { responseMimeType: "application/json", responseSchema: receiptSchema },
    },
  };

  return {
    /** Uses the on-device model when the browser has it, otherwise falls back to the cloud by itself. */
    preferDevice: getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE, ...shared }),
    /** Always the cloud. Used when the on-device answer is not good enough. */
    cloudOnly: getGenerativeModel(ai, { mode: InferenceMode.ONLY_IN_CLOUD, ...shared }),
  };
}

function models() {
  if (!isAiConfigured) throw new Error("AI is not configured. Add your Firebase keys to web/.env.");
  cachedModels ??= createModels();
  return cachedModels;
}

/**
 * Starts downloading the on-device model. Chrome only allows this from a user gesture,
 * so call it from a click. Failures are ignored: the cloud fallback still works.
 */
export async function prepareDeviceModel(onProgress?: (fraction: number) => void): Promise<void> {
  if (!isAiConfigured) return;
  try {
    await models().preferDevice.initializeDeviceModel((fraction: number) => onProgress?.(fraction));
  } catch {
    // On-device model unavailable (not desktop Chrome, flag off, no space): cloud will be used.
  }
}

function parseFields(text: string): Partial<ExtractedFields> | null {
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object") return null;
    const fields = value as Partial<ExtractedFields>;
    // Small models often copy the date as printed (03/10/26). Convert it instead of rejecting.
    if (typeof fields.purchaseDate === "string") {
      fields.purchaseDate = normalizeDate(fields.purchaseDate) ?? fields.purchaseDate;
    }
    return fields;
  } catch {
    return null;
  }
}

async function run(model: ReturnType<typeof createModels>["preferDevice"], image: PreparedImage) {
  const result = await model.generateContent([
    PROMPT,
    { type: "inlineData" as const, inlineData: { data: image.base64, mimeType: image.mimeType } },
  ]);
  const text = result.response.text();
  // Dev only: shows what each path really returned, so the prompt and checks can be tuned.
  if (import.meta.env.DEV) console.debug("[InstaScan] model answer:", text);
  const source = String(result.response.inferenceSource ?? "").toUpperCase().includes("DEVICE")
    ? ("on-device" as const)
    : ("cloud" as const);
  return { fields: parseFields(text), source };
}

/**
 * Reads a receipt photo.
 * 1. Try on-device (privacy, offline, instant). If the browser has no on-device model the SDK
 *    answers from the cloud and we record that.
 * 2. If the on-device answer fails validation, retry in the cloud and record why.
 */
export async function extractReceipt(image: PreparedImage, onStage: (stage: AiStage) => void): Promise<AiResult> {
  const { preferDevice, cloudOnly } = models();

  onStage("device");
  let first: Awaited<ReturnType<typeof run>> | null = null;
  let firstError: unknown = null;
  try {
    first = await run(preferDevice, image);
  } catch (error) {
    firstError = error;
  }

  if (first?.source === "on-device") {
    const reason = rejectReason(first.fields);
    if (!reason) return { fields: first.fields ?? {}, source: "on-device" };

    onStage("cloud");
    const second = await run(cloudOnly, image);
    const finalReason = rejectReason(second.fields);
    return {
      fields: second.fields ?? {},
      source: "cloud",
      reason: `The on-device read was rejected (${reason}), so the cloud model took a closer look.`,
      warning: finalReason ? `Some details are missing (${finalReason}). Please check them.` : undefined,
    };
  }

  // Either the SDK already answered from the cloud, or the first attempt failed outright.
  let answer = first;
  if (!answer) {
    onStage("cloud");
    try {
      answer = await run(cloudOnly, image);
    } catch (error) {
      throw firstError ?? error;
    }
  }
  const finalReason = rejectReason(answer.fields);
  return {
    fields: answer.fields ?? {},
    source: "cloud",
    reason: "The on-device model is not available in this browser, so the cloud model was used.",
    warning: finalReason ? `Some details are missing (${finalReason}). Please check them.` : undefined,
  };
}
