import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"

export interface BaseFieldProps {
  name: string
  label: string
  required?: boolean
  description?: string
  className?: string
  disabled?: boolean
}

interface FormFieldShellProps {
  label: string
  htmlFor?: string
  required?: boolean
  description?: string
  error?: string
  className?: string
  children: React.ReactNode
}

/** Label + control + help text + error — the layout every field shares. */
export function FormFieldShell({ label, htmlFor, required, description, error, className, children }: FormFieldShellProps) {
  return (
    <Field data-invalid={Boolean(error) || undefined} className={cn("gap-1.5", className)}>
      <FieldLabel htmlFor={htmlFor} className="text-[13px]">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </FieldLabel>
      {children}
      {description && !error && <FieldDescription className="text-xs">{description}</FieldDescription>}
      {error && <FieldError className="text-xs">{error}</FieldError>}
    </Field>
  )
}

/** Titled group of fields laid out in a responsive grid. */
export function FormSection({
  title,
  description,
  children,
  columns = 2,
}: {
  title?: string
  description?: string
  children: React.ReactNode
  columns?: 1 | 2 | 3
}) {
  return (
    <section className="space-y-4">
      {title && (
        <div className="border-b border-border/70 pb-3">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
        </div>
      )}
      <div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3")}>{children}</div>
    </section>
  )
}
