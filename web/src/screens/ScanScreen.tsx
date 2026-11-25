import { useState } from "react";
import { extractReceipt, isAiConfigured, prepareDeviceModel } from "../core/ai";
import { normalizeCategory } from "../core/categories";
import { addMonths, parseISODate, toISODate } from "../core/deadlines";
import { prepareImage, type PreparedImage } from "../core/image";
import { makeItem } from "../core/items";
import { saveReceiptImage } from "../core/images";
import { normalizeAmount } from "../core/money";
import type { AiResult, AiStage, Item, Source } from "../core/types";
import { PathBadge } from "../components/PathBadge";
import {
  applyForm,
  emptyForm,
  ItemForm,
  validateForm,
  type FormErrors,
  type FormState,
} from "../components/ItemForm";
import { CameraView } from "./CameraView";

type Mode = "auto" | "manual";
type Step = "camera" | "processing" | "form";

const STAGE_TEXT: Record<AiStage, string> = {
  preparing: "Getting your device ready…",
  device: "Reading on your device…",
  cloud: "Taking a closer look in the cloud…",
};

interface Meta {
  source: Source;
  reason?: string;
  note?: string;
  /** The store on the receipt. Shown as information, not used as the warranty provider. */
  seller?: string;
}

interface Props {
  defaultCurrency: string;
  onAdd: (item: Item) => void;
}

export function ScanScreen({ defaultCurrency, onAdd }: Props) {
  const [mode, setMode] = useState<Mode>(isAiConfigured ? "auto" : "manual");
  const [step, setStep] = useState<Step>("camera");
  const [stage, setStage] = useState<AiStage>("preparing");
  const [progress, setProgress] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [meta, setMeta] = useState<Meta>({ source: "manual" });
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const showForm = mode === "manual" || step === "form";

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setErrors({});
    if (next === "auto") {
      setStep("camera");
    } else {
      setMeta({ source: "manual" });
      setImage(null);
    }
  }

  async function handleCapture(file: Blob) {
    setError(null);
    setStep("processing");
    setStage("preparing");
    setProgress(null);
    try {
      // Needs the click that triggered this capture; downloads the on-device model if absent.
      await prepareDeviceModel((fraction) => setProgress(fraction));
      setProgress(null);
      const prepared = await prepareImage(file);
      const result = await extractReceipt(prepared, setStage);
      setImage(prepared);
      applyResult(result);
      setStep("form");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while reading the receipt.");
      setStep("camera");
    }
  }

  function applyResult(result: AiResult) {
    const f = result.fields;
    const endDate =
      f.purchaseDate && f.warrantyMonths && f.warrantyMonths > 0 ? addMonths(f.purchaseDate, f.warrantyMonths) : "";
    const amount =
      f.total !== undefined ? (normalizeAmount(`${f.currency ?? ""} ${f.total}`.trim(), defaultCurrency) ?? "") : "";
    const seller = f.merchant?.trim() ?? "";
    setErrors({});
    setForm({
      ...emptyForm(),
      name: f.itemName?.trim() || seller,
      amount,
      purchaseDate: f.purchaseDate && parseISODate(f.purchaseDate) ? f.purchaseDate : toISODate(new Date()),
      category: normalizeCategory(f.category),
      isSubscription: f.isSubscription === true,
      endDate,
      // The store is not necessarily the warranty provider. Only assume it when the receipt
      // actually prints a warranty length; otherwise leave it for the user.
      provider: endDate ? seller : "",
    });
    const notes: string[] = [];
    if (endDate) notes.push("Warranty end date was worked out from the length printed on the receipt.");
    else notes.push("No warranty length was printed, so add the end date and who gives the warranty yourself.");
    if (result.warning) notes.push(result.warning);
    setMeta({ source: result.source, reason: result.reason, note: notes.join(" "), seller: seller || undefined });
  }

  async function handleAdd() {
    const found = validateForm(form, defaultCurrency);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const base = makeItem({
      name: form.name.trim(),
      merchant: meta.seller ?? "",
      source: meta.source,
      sourceReason: meta.reason,
    });
    let item = applyForm(form, base, defaultCurrency);
    if (image && mode === "auto") {
      item = { ...item, hasReceiptImage: await saveReceiptImage(item.id, image.previewUrl) };
    }

    onAdd(item);
    setForm(emptyForm());
    setErrors({});
    setImage(null);
    setMeta({ source: "manual" });
    if (mode === "auto") setStep("camera");
  }

  return (
    <div className="page">
      <div className="segmented" role="group" aria-label="Scan mode">
        <button
          className={mode === "auto" ? "seg seg-on" : "seg"}
          onClick={() => switchMode("auto")}
          disabled={!isAiConfigured}
          aria-pressed={mode === "auto"}
        >
          Auto (AI)
        </button>
        <button
          className={mode === "manual" ? "seg seg-on" : "seg"}
          onClick={() => switchMode("manual")}
          aria-pressed={mode === "manual"}
        >
          Manual
        </button>
      </div>

      {!isAiConfigured && (
        <p className="notice">
          AI scanning is off because no Firebase keys are set. Add them to <code>web/.env</code> to turn on Auto (AI).
          Manual entry works now.
        </p>
      )}
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}

      {mode === "auto" && step === "camera" && <CameraView onCapture={handleCapture} />}

      {mode === "auto" && step === "processing" && (
        <div className="processing" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p>{STAGE_TEXT[stage]}</p>
          {progress !== null && <p className="muted">Downloading the on-device model: {Math.round(progress * 100)}%</p>}
        </div>
      )}

      {showForm && (
        <>
          {mode === "auto" && (
            <div className="source-row">
              <span>Read by</span> <PathBadge source={meta.source} reason={meta.reason} />
              {meta.seller && (
                <p className="muted">
                  Seller on the receipt: <strong>{meta.seller}</strong>
                </p>
              )}
              {meta.reason && <p className="muted">{meta.reason}</p>}
              {meta.note && <p className="muted">{meta.note}</p>}
              <p className="muted">Check the details below before adding.</p>
            </div>
          )}
          <ItemForm
            form={form}
            onChange={setForm}
            errors={errors}
            onSubmit={() => void handleAdd()}
            submitLabel="Add!"
          />
        </>
      )}
    </div>
  );
}
