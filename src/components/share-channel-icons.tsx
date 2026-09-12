import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BrandSvg({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      {children}
    </svg>
  );
}

export function GmailIcon(props: IconProps) {
  return (
    <BrandSvg {...props}>
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2 .9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z" />
    </BrandSvg>
  );
}
