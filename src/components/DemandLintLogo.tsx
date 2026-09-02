import demandLintIconUrl from "../assets/demandlint-icon.svg";

interface DemandLintLogoProps {
  className?: string;
  decorative?: boolean;
  label?: string;
  width?: number;
}

const ICON_ASPECT_RATIO = 104 / 64;

export function DemandLintLogo({
  className = "",
  decorative = true,
  label = "DemandLint",
  width = 40,
}: DemandLintLogoProps) {
  return (
    <img
      className={`demandlint-logo ${className}`.trim()}
      src={demandLintIconUrl}
      width={width}
      height={Math.round(width / ICON_ASPECT_RATIO)}
      alt={decorative ? "" : label}
      aria-hidden={decorative || undefined}
      draggable="false"
    />
  );
}
