import { useId, useRef } from "react";
import { Icon } from "./Icon";

interface Props {
  label: string;
  /** ISO date (YYYY-MM-DD), or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Adds a button that empties the date. Use it for dates that are optional. */
  clearable?: boolean;
}

/**
 * A date field with a visible calendar button.
 *
 * It is the browser's own date input, so the calendar that opens is the native one: the system
 * calendar on phones, and the browser's on a computer. Typing a date still works. The input keeps
 * a proper label, so screen readers and keyboards behave as they do for any date field.
 */
export function DateField({ label, value, onChange, error, clearable = false }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  function openCalendar() {
    const el = input.current;
    if (!el) return;
    try {
      el.showPicker(); // opens the native calendar
    } catch {
      el.focus(); // an older browser: at least put the cursor in the field
    }
  }

  const showClear = clearable && value !== "";

  return (
    <div className={showClear ? "field field-date field-date-clearable" : "field field-date"}>
      <label htmlFor={id}>{label}</label>
      <div className="date-field">
        <input
          ref={input}
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error !== undefined}
        />
        <button
          type="button"
          className="date-btn"
          onClick={openCalendar}
          aria-label={`Open the calendar for ${label}`}
          title="Open the calendar"
        >
          <Icon name="event" size={22} />
        </button>
        {showClear && (
          <button
            type="button"
            className="date-btn"
            onClick={() => onChange("")}
            aria-label={`Clear ${label}`}
            title="Clear the date"
          >
            <Icon name="close" size={20} />
          </button>
        )}
      </div>
      {error && <small className="error">{error}</small>}
    </div>
  );
}
