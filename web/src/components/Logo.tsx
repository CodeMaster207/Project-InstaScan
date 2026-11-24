/** Logo with the app name beside it. Use `heading` where it is the page's main title. */
export function Brand({ size = 56, heading = false }: { size?: number; heading?: boolean }) {
  const Name = heading ? "h1" : "p";
  return (
    <div className="brand">
      <Logo size={size} />
      <Name className="brand-name" style={{ fontSize: `${size * 0.5}px` }}>
        InstaScan
      </Name>
    </div>
  );
}

/** App logo: the pixel-art image in public/logo.png, kept crisp when scaled. */
export function Logo({ size = 96 }: { size?: number }) {
  return (
    <img
      className="logo"
      src={`${import.meta.env.BASE_URL}logo.png`}
      width={size}
      height={size}
      alt="InstaScan logo"
    />
  );
}
