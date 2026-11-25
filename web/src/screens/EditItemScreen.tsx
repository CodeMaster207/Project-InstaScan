import { useEffect, useState } from "react";
import { loadReceiptImage } from "../core/images";
import type { Item } from "../core/types";
import { applyForm, formFromItem, ItemForm, validateForm, type FormErrors, type FormState } from "../components/ItemForm";
import { PathBadge } from "../components/PathBadge";

interface Props {
  item: Item;
  defaultCurrency: string;
  onSave: (item: Item) => void;
  onDelete: (id: string) => void;
}

type Tab = "details" | "receipt";

/** Edit page draft: change an item's details afterward, or view the scanned receipt. */
export function EditItemScreen({ item, defaultCurrency, onSave, onDelete }: Props) {
  const [tab, setTab] = useState<Tab>("details");
  const [form, setForm] = useState<FormState>(() => formFromItem(item));
  const [errors, setErrors] = useState<FormErrors>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoLoaded, setPhotoLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPhotoLoaded(false);
    void loadReceiptImage(item.id).then((url) => {
      if (cancelled) return;
      setPhoto(url);
      setPhotoLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  function save() {
    const found = validateForm(form, defaultCurrency);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave(applyForm(form, item, defaultCurrency));
  }

  return (
    <div className="page">
      <div className="segmented" role="group" aria-label="Edit view">
        <button className={tab === "details" ? "seg seg-on" : "seg"} aria-pressed={tab === "details"} onClick={() => setTab("details")}>
          Details
        </button>
        <button className={tab === "receipt" ? "seg seg-on" : "seg"} aria-pressed={tab === "receipt"} onClick={() => setTab("receipt")}>
          Receipt
        </button>
      </div>

      {tab === "details" && (
        <>
          <p className="muted source-line">
            Read by <PathBadge source={item.source} reason={item.sourceReason} />
            {item.merchant && (
              <>
                {" "}
                · Seller on the receipt: <strong>{item.merchant}</strong>
              </>
            )}
          </p>
          <ItemForm
            form={form}
            onChange={setForm}
            errors={errors}
            onSubmit={save}
            submitLabel="Save changes"
            extraActions={
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  if (window.confirm(`Delete "${item.name}" everywhere (expenses, warranty and subscriptions)?`)) {
                    onDelete(item.id);
                  }
                }}
              >
                Delete
              </button>
            }
          />
        </>
      )}

      {tab === "receipt" && (
        <div className="receipt-view">
          {!photoLoaded && <p className="muted">Loading…</p>}
          {photoLoaded && photo && <img src={photo} alt={`Scanned receipt for ${item.name}`} className="receipt-img" />}
          {photoLoaded && !photo && (
            <p className="notice">
              {item.hasReceiptImage
                ? "This receipt photo is stored on the device where it was scanned, not on this one. Photos are never synced."
                : "No receipt photo was saved for this item (it was entered by hand)."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
