import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-solid";
type Size = "sm" | "md";

const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-control font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent/90",
  secondary:
    "border border-line-strong bg-raised text-ink hover:border-ink/40 hover:bg-sunken",
  ghost: "text-muted hover:bg-sunken hover:text-ink",
  danger:
    "border border-danger/40 bg-raised text-danger hover:border-danger hover:bg-danger/10",
  "danger-solid": "bg-danger text-raised hover:bg-danger/90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-meta",
  md: "h-9 px-3.5 text-ui",
};

export function buttonClass(
  variant: Variant = "secondary",
  size: Size = "md",
  extra = "",
) {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant,
  size,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      {...props}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

export function ButtonLink({
  variant,
  size,
  className = "",
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
