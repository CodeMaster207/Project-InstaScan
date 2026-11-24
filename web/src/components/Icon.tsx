import { icons, type IconName } from "./icons";

interface IconProps {
  name: IconName;
  /** Accessible label. Omit for purely decorative icons. */
  label?: string;
  size?: number;
}

export function Icon({ name, label, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={icons[name]} />
    </svg>
  );
}
