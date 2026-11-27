import { useEffect, useRef } from "react";
import type { Discovery } from "../core/policy";

interface Props {
  discovery: Discovery;
  onClose: () => void;
}

/**
 * The pop-up shown when a sync finds items in the person's account that this device did not have.
 * It is a real dialog: it takes focus, closes with Escape or the button, and screen readers announce it.
 */
export function DiscoveryDialog({ discovery, onClose }: Props) {
  const button = useRef<HTMLButtonElement>(null);
  const { names, count, mentionsPhotos } = discovery;
  const more = count - names.length;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    button.current?.focus();
    return () => previous?.focus?.(); // put the person back where they were
  }, []);

  return (
    <div className="dialog-scrim" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="discovery-title" aria-describedby="discovery-body">
        <h2 id="discovery-title">{count === 1 ? "A new item was found" : `${count} new items were found`}</h2>
        <div id="discovery-body">
          <p>
            {count === 1 ? "It was" : "They were"} in your account but not on this device, so {count === 1 ? "it was" : "they were"}{" "}
            added automatically:
          </p>
          <ul className="dialog-list">
            {names.map((name, index) => (
              <li key={`${name}-${index}`}>{name}</li>
            ))}
            {more > 0 && <li className="muted">and {more} more</li>}
          </ul>
          {mentionsPhotos && <p className="muted">Receipt photos stay on the device where they were scanned.</p>}
        </div>
        <button ref={button} type="button" className="btn btn-primary" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
