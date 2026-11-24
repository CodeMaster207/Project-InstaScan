import { useState } from "react";
import { extractReceipt, isAiConfigured, prepareDeviceModel } from "../core/ai";
import { addMonths, parseISODate } from "../core/deadlines";
import { prepareImage } from "../core/image";
import type { AiResult, AiStage, Source, WarrantyItem } from "../core/types";
import { PathBadge } from "../components/PathBadge";
import { CameraView } from "./CameraView";

const REMIND_OPTIONS = [1, 3, 7, 14, 30];

type Mode = "auto" | "manual";
type Step = "camera" | "processing" | "form";

interface Form {
  name: string;
  amount: string;
  endDate: string;
  provider: string;
  nextPayment: string;
  discountPercent: string;
  discountStart: string;
  discountEnd: string;
  remind: boolean;
  remindDays: number;
}

const EMPTY: Form = {
  name: "",
  amount: "",
  endDate: "",
  provider: "",
  nextPayment: "",
  discountPercent: "",
  discountStart: "",
  discountEnd: "",
  remind: false,
  remindDays: 7,
};

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

export function ScanScreen({ onAdd }: { onAdd: (item: WarrantyItem) => void }) {
  const [mode, setMode] = useState<Mode>(isAiConfigured ? "auto" : "manual");
  const [step, setStep] = useState<Step>("camera");
  const [stage, setStage] = useState<AiStage>("preparing");
  const [progress, setProgress] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [meta, setMeta] = useState<Meta>({ source: "manual" });
  const [error, setError] = useState<string | null>(null);
  const [triedToAdd, setTriedToAdd] = useState(false);

  const showForm = mode === "manual" || step === "form";
  const nameMissing = form.name.trim() === "";
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    if (next === "auto") setStep("camera");
    else setMeta({ source: "manual" });
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
      const image = await prepareImage(file);
      const result = await extractReceipt(image, setStage);
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
    const amount = f.total !== undefined ? `${f.currency ?? ""} ${f.total}`.trim() : "";
    const seller = f.merchant?.trim() ?? "";
    setForm({
      ...EMPTY,
      name: f.itemName?.trim() || seller,
      amount,
      // The store is not necessarily the warranty provider. Only assume it when the receipt
      // actually prints a warranty length; otherwise leave it for the user.
      provider: endDate ? seller : "",
      endDate,
    });
    const notes: string[] = [];
    if (endDate) notes.push("Warranty end date was worked out from the length printed on the receipt.");
    else notes.push("No warranty length was printed, so add the end date and who gives the warranty yourself.");
    if (result.warning) notes.push(result.warning);
    setMeta({ source: result.source, reason: result.reason, note: notes.join(" "), seller: seller || undefined });
  }

  function handleAdd() {
    setTriedToAdd(true);
    if (nameMissing) return;
    const discountPeriod =
      form.discountStart || form.discountEnd ? `${form.discountStart || "?"} to ${form.discountEnd || "?"}` : "";
    onAdd({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      amount: form.amount.trim(),
      endDate: parseISODate(form.endDate) ? form.endDate : "",
      provider: form.provider.trim(),
      nextPayment: form.nextPayment,
      discountPercent: form.discountPercent.trim(),
      discountPeriod,
      remindDays: form.remind ? form.remindDays : null,
      activated: false,
      notify: form.remind,
      source: meta.source,
      sourceReason: meta.reason,
    });
    setForm(EMPTY);
    setTriedToAdd(false);
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
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
        >
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

          <label className="field">
            <span>Name</span>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Expense name"
              aria-invalid={triedToAdd && nameMissing}
            />
            {triedToAdd && nameMissing && <small className="error">Name is required</small>}
          </label>

          <label className="field">
            <span>Amount</span>
            <input value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="Money" />
          </label>

          <fieldset>
            <legend>Warranty details</legend>
            <p className="muted">How long does it last</p>
            <div className="row">
              <label className="field">
                <span>End date</span>
                <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </label>
              <label className="field">
                <span>By</span>
                <input
                  value={form.provider}
                  onChange={(e) => set("provider", e.target.value)}
                  placeholder="Seller / Manufacturer"
                />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Subscription details</legend>
            <p className="muted">The next cycle will start at when</p>
            <div className="row">
              <label className="field">
                <span>Next payment at</span>
                <input type="date" value={form.nextPayment} onChange={(e) => set("nextPayment", e.target.value)} />
              </label>
              <label className="field">
                <span>Any discount given</span>
                <input
                  inputMode="decimal"
                  value={form.discountPercent}
                  onChange={(e) => set("discountPercent", e.target.value)}
                  placeholder="%"
                />
              </label>
            </div>
            <div className="row">
              <label className="field">
                <span>Discount valid from</span>
                <input type="date" value={form.discountStart} onChange={(e) => set("discountStart", e.target.value)} />
              </label>
              <label className="field">
                <span>Discount valid until</span>
                <input type="date" value={form.discountEnd} onChange={(e) => set("discountEnd", e.target.value)} />
              </label>
            </div>
          </fieldset>

          <label className="check">
            <input type="checkbox" checked={form.remind} onChange={(e) => set("remind", e.target.checked)} />
            <strong>Remind me when</strong>
          </label>
          {form.remind && (
            <label className="field">
              <span>Before the end date</span>
              <select value={form.remindDays} onChange={(e) => set("remindDays", Number(e.target.value))}>
                {REMIND_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Add!
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
