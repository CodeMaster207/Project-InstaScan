import type { Source } from "../core/types";

const LABELS: Record<Source, string> = {
  "on-device": "On-device",
  cloud: "Cloud",
  manual: "Manual",
};

/** Shows where a receipt's details came from. Uses text, not just colour. */
export function PathBadge({ source, reason }: { source: Source; reason?: string }) {
  return (
    <span className={`badge badge-${source}`} title={reason}>
      {LABELS[source]}
    </span>
  );
}
