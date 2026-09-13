import {
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { CheckCircle, User, SpinnerGap } from "@phosphor-icons/react";
import { KeyboardInput, KeyboardTextarea, useKeyboard } from "./mobile";
import { useKaki } from "./kaki-context";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const { desktop } = useKaki();
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      type="button"
      {...props}
      onPointerDown={(event) => {
        props.onPointerDown?.(event);
        // Keep the keyboard from moving a submit target between press and release.
        // The pointer event still bubbles to MobileScroll for drag suppression.
        if (!desktop && props.type === "submit" && document.activeElement?.matches("input, textarea")) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`icon-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { desktop } = useKaki();
  const keyboard = useKeyboard();
  const blur = (e: any) => {
    props.onBlur?.(e);
    if (
      !(e.relatedTarget instanceof Element) ||
      !e.relatedTarget.matches("input, textarea")
    )
      keyboard.hide();
  };
  return desktop ? (
    <input {...props} className={`input ${props.className || ""}`} />
  ) : (
    <KeyboardInput
      {...props}
      onBlur={blur}
      className={`input ${props.className || ""}`}
    />
  );
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { desktop } = useKaki();
  const keyboard = useKeyboard();
  const blur = (e: any) => {
    props.onBlur?.(e);
    if (
      !(e.relatedTarget instanceof Element) ||
      !e.relatedTarget.matches("input, textarea")
    )
      keyboard.hide();
  };
  return desktop ? (
    <textarea
      {...props}
      className={`input textarea ${props.className || ""}`}
    />
  ) : (
    <KeyboardTextarea
      {...props}
      onBlur={blur}
      className={`input textarea ${props.className || ""}`}
    />
  );
}
export function PageHeading({
  title,
  eyebrow,
  subtitle,
  action,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>{children}</h2>
      {action}
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Badge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Avatar({
  person,
  src,
  name,
  size = 40,
}: {
  person?: any;
  src?: string;
  name?: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const path = src || person?.avatar;
  const label = name || person?.name || "Student";
  return (
    <span
      className="avatar"
      style={{ width: size, height: size }}
      title={label}
    >
      {path && !broken ? (
        <img
          src={path}
          alt={label}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <User size={size * 0.52} weight="duotone" />
      )}
    </span>
  );
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <CheckCircle size={42} weight="duotone" />
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}
export function Busy({ text = "Getting things ready…" }: { text?: string }) {
  return (
    <div className="busy">
      <SpinnerGap className="spin" size={24} />
      <span>{text}</span>
    </div>
  );
}
export function ErrorText({ children }: { children: ReactNode }) {
  return children ? (
    <p className="error-text" role="alert">
      {children}
    </p>
  ) : null;
}
