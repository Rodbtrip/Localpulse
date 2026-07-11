"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./Button";

type Variant = "primary" | "secondary" | "danger";

// Must be rendered as a descendant of the <form> it submits — useFormStatus()
// only reads context set by the nearest parent <form>, so this can't live in
// the same component that calls useFormState() for the form's action.
export function SubmitButton({
  children,
  pendingText,
  variant,
  className,
}: {
  children: ReactNode;
  pendingText: string;
  variant?: Variant;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} className={className} disabled={pending}>
      {pending ? pendingText : children}
    </Button>
  );
}
