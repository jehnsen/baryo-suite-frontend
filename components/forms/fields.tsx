"use client"

import { useId, useState } from "react"
import { useController, useFormContext, useWatch } from "react-hook-form"
import { format, parseISO } from "date-fns"
import { CalendarIcon, Check, ChevronsUpDown, Eye, Pencil, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { FileUpload, type UploadedFile } from "@/components/shared/file-upload"
import { useSettings } from "@/hooks/use-data"
import { toISODate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { FormFieldShell, type BaseFieldProps } from "./form-field"

export interface Option {
  label: string
  value: string
  description?: string
}

function useField(name: string) {
  const { control } = useFormContext()
  return useController({ name, control })
}

/* ------------------------------ Text inputs ------------------------------ */

export function TextField({
  name,
  label,
  required,
  description,
  className,
  disabled,
  placeholder,
  type = "text",
  autoComplete,
}: BaseFieldProps & { placeholder?: string; type?: string; autoComplete?: string }) {
  const id = useId()
  const { field, fieldState } = useField(name)
  return (
    <FormFieldShell label={label} htmlFor={id} required={required} description={description} error={fieldState.error?.message} className={className}>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={fieldState.invalid}
        {...field}
        value={field.value ?? ""}
      />
    </FormFieldShell>
  )
}

export function TextareaField({
  name,
  label,
  required,
  description,
  className,
  disabled,
  placeholder,
  rows = 4,
}: BaseFieldProps & { placeholder?: string; rows?: number }) {
  const id = useId()
  const { field, fieldState } = useField(name)
  return (
    <FormFieldShell label={label} htmlFor={id} required={required} description={description} error={fieldState.error?.message} className={className}>
      <Textarea id={id} rows={rows} placeholder={placeholder} disabled={disabled} aria-invalid={fieldState.invalid} {...field} value={field.value ?? ""} />
    </FormFieldShell>
  )
}

export const markdownPreviewComponents = {
  h1: (p: React.ComponentProps<"h1">) => <h1 className="mt-3 mb-1.5 text-base font-semibold first:mt-0" {...p} />,
  h2: (p: React.ComponentProps<"h2">) => <h2 className="mt-3 mb-1.5 text-sm font-semibold first:mt-0" {...p} />,
  h3: (p: React.ComponentProps<"h3">) => <h3 className="mt-2 mb-1 text-sm font-semibold first:mt-0" {...p} />,
  p: (p: React.ComponentProps<"p">) => <p className="mb-2 leading-relaxed last:mb-0" {...p} />,
  ul: (p: React.ComponentProps<"ul">) => <ul className="mb-2 list-disc space-y-0.5 pl-5 last:mb-0" {...p} />,
  ol: (p: React.ComponentProps<"ol">) => <ol className="mb-2 list-decimal space-y-0.5 pl-5 last:mb-0" {...p} />,
  li: (p: React.ComponentProps<"li">) => <li className="leading-relaxed" {...p} />,
  a: (p: React.ComponentProps<"a">) => <a className="underline underline-offset-2 hover:text-foreground" target="_blank" rel="noreferrer" {...p} />,
  strong: (p: React.ComponentProps<"strong">) => <strong className="font-semibold text-foreground" {...p} />,
  blockquote: (p: React.ComponentProps<"blockquote">) => <blockquote className="border-l-2 pl-3 text-muted-foreground" {...p} />,
  code: (p: React.ComponentProps<"code">) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs" {...p} />,
  hr: (p: React.ComponentProps<"hr">) => <hr className="my-3 border-border" {...p} />,
}

/** Markdown textarea with a Write/Preview toggle — for longer, formatted free text (e.g. incident descriptions). */
export function MarkdownField({
  name,
  label,
  required,
  description,
  className,
  disabled,
  placeholder,
  rows = 6,
}: BaseFieldProps & { placeholder?: string; rows?: number }) {
  const id = useId()
  const { field, fieldState } = useField(name)
  const [tab, setTab] = useState<"write" | "preview">("write")
  const value: string = field.value ?? ""

  return (
    <FormFieldShell label={label} htmlFor={id} required={required} description={description} error={fieldState.error?.message} className={className}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "write" | "preview")}>
        <TabsList variant="line" className="mb-1.5 h-7">
          <TabsTrigger value="write" className="gap-1 text-xs">
            <Pencil /> Write
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1 text-xs">
            <Eye /> Preview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="write">
          <Textarea
            id={id}
            rows={rows}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
            {...field}
            value={value}
            className="font-mono text-sm"
          />
        </TabsContent>
        <TabsContent value="preview">
          <div
            className="min-h-16 w-full rounded-lg border border-input px-3 py-2 text-sm"
            style={{ minHeight: `calc(${rows} * 1.5em + 1.25rem)` }}
          >
            {value.trim() ? (
              <ReactMarkdown components={markdownPreviewComponents}>{value}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">Nothing to preview yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </FormFieldShell>
  )
}

/** Formats input as `09XX XXX XXXX` while typing. */
export function PhoneField({ name, label = "Contact number", required, description, className, disabled }: Omit<BaseFieldProps, "label"> & { label?: string }) {
  const id = useId()
  const { field, fieldState } = useField(name)
  const formatPhone = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 11)
    return [d.slice(0, 4), d.slice(4, 7), d.slice(7, 11)].filter(Boolean).join(" ")
  }
  return (
    <FormFieldShell label={label} htmlFor={id} required={required} description={description} error={fieldState.error?.message} className={className}>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText className="text-xs">🇵🇭</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          inputMode="tel"
          placeholder="0917 123 4567"
          disabled={disabled}
          aria-invalid={fieldState.invalid}
          {...field}
          value={field.value ?? ""}
          onChange={(e) => field.onChange(formatPhone(e.target.value))}
        />
      </InputGroup>
    </FormFieldShell>
  )
}

/** Peso amount stored as a number. */
export function MoneyField({ name, label, required, description, className, disabled }: BaseFieldProps) {
  const id = useId()
  const { field, fieldState } = useField(name)
  return (
    <FormFieldShell label={label} htmlFor={id} required={required} description={description} error={fieldState.error?.message} className={className}>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>₱</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="0.00"
          disabled={disabled}
          aria-invalid={fieldState.invalid}
          {...field}
          value={field.value === undefined || field.value === null || Number.isNaN(field.value) ? "" : field.value}
          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="tabular-nums"
        />
      </InputGroup>
    </FormFieldShell>
  )
}

/* -------------------------------- Selects -------------------------------- */

export function SelectField({
  name,
  label,
  required,
  description,
  className,
  disabled,
  options,
  placeholder = "Select…",
}: BaseFieldProps & { options: Option[]; placeholder?: string }) {
  const id = useId()
  const { field, fieldState } = useField(name)
  return (
    <FormFieldShell label={label} htmlFor={id} required={required} description={description} error={fieldState.error?.message} className={className}>
      <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full" aria-invalid={fieldState.invalid} onBlur={field.onBlur}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldShell>
  )
}

export function MultiSelectField({
  name,
  label,
  required,
  description,
  className,
  disabled,
  options,
  placeholder = "Select…",
}: BaseFieldProps & { options: Option[]; placeholder?: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const { field, fieldState } = useField(name)
  const value: string[] = field.value ?? []
  const toggle = (v: string) => field.onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <FormFieldShell label={label} htmlFor={id} required={required} description={description} error={fieldState.error?.message} className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={fieldState.invalid}
            className="h-auto min-h-8 w-full justify-between px-2.5 py-1 font-normal"
          >
            <span className="flex flex-wrap gap-1">
              {value.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                options
                  .filter((o) => value.includes(o.value))
                  .map((o) => (
                    <span key={o.value} className="inline-flex items-center gap-1 rounded-sm bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">
                      {o.label}
                      <X
                        className="size-3 cursor-pointer opacity-60 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggle(o.value)
                        }}
                      />
                    </span>
                  ))
              )}
            </span>
            <ChevronsUpDown className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            {options.length > 6 && <CommandInput placeholder="Search…" />}
            <CommandList>
              <CommandEmpty>No options.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem key={o.value} onSelect={() => toggle(o.value)}>
                    <Checkbox checked={value.includes(o.value)} className="pointer-events-none" />
                    {o.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FormFieldShell>
  )
}

/* ---------------------------------- Date --------------------------------- */

export function DateField({
  name,
  label,
  required,
  description,
  className,
  disabled,
  fromYear = 1920,
  toYear = new Date().getFullYear() + 2,
  disableFuture,
}: BaseFieldProps & { fromYear?: number; toYear?: number; disableFuture?: boolean }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const { field, fieldState } = useField(name)
  const selected = field.value ? parseISO(field.value) : undefined
  return (
    <FormFieldShell label={label} htmlFor={id} required={required} description={description} error={fieldState.error?.message} className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={fieldState.invalid}
            onBlur={field.onBlur}
            className="w-full justify-start px-2.5 font-normal"
          >
            <CalendarIcon className="text-muted-foreground" />
            {selected ? format(selected, "MMMM d, yyyy") : <span className="text-muted-foreground">Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            captionLayout="dropdown"
            startMonth={new Date(fromYear, 0)}
            endMonth={new Date(toYear, 11)}
            disabled={disableFuture ? { after: new Date() } : undefined}
            onSelect={(d) => {
              field.onChange(d ? toISODate(d) : "")
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </FormFieldShell>
  )
}

/* -------------------------------- Booleans ------------------------------- */

export function SwitchField({ name, label, description, className, disabled }: Omit<BaseFieldProps, "required">) {
  const id = useId()
  const { field } = useField(name)
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-2.5 has-data-[state=checked]:border-primary/30 has-data-[state=checked]:bg-accent/50",
        className,
      )}
    >
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
      <Switch id={id} checked={Boolean(field.value)} onCheckedChange={field.onChange} disabled={disabled} />
    </label>
  )
}

export function CheckboxField({ name, label, description, className, disabled }: Omit<BaseFieldProps, "required">) {
  const id = useId()
  const { field } = useField(name)
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-2.5", className)}>
      <Checkbox id={id} checked={Boolean(field.value)} onCheckedChange={(v) => field.onChange(v === true)} disabled={disabled} className="mt-0.5" />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
    </label>
  )
}

/* ------------------------------- Attachments ----------------------------- */

export function FileField({
  name,
  label,
  required,
  description,
  className,
  disabled,
  accept,
  multiple = true,
}: BaseFieldProps & { accept?: string; multiple?: boolean }) {
  const id = useId()
  const { field, fieldState } = useField(name)
  return (
    <FormFieldShell label={label} htmlFor={id} required={required} description={description} error={fieldState.error?.message} className={className}>
      <FileUpload id={id} value={(field.value as UploadedFile[]) ?? []} onChange={field.onChange} accept={accept} multiple={multiple} disabled={disabled} />
    </FormFieldShell>
  )
}

/* --------------------------------- Address ------------------------------- */

/** House no. / street / purok / sitio bound to `${prefix}.*`. Sitio options follow the purok. */
export function AddressFields({ prefix = "address", required = true, disabled }: { prefix?: string; required?: boolean; disabled?: boolean }) {
  const settings = useSettings()
  const { setValue } = useFormContext()
  const purok = useWatch({ name: `${prefix}.purok` }) as string | undefined
  const sitios = settings.puroks.find((p) => p.name === purok)?.sitios ?? []
  return (
    <>
      <TextField name={`${prefix}.houseNumber`} label="House / Lot No." required={required} placeholder="e.g. 123-A" disabled={disabled} />
      <TextField name={`${prefix}.street`} label="Street" required={required} placeholder="e.g. Rizal St." disabled={disabled} />
      <PurokSelect name={`${prefix}.purok`} required={required} disabled={disabled} onPurokChange={() => setValue(`${prefix}.sitio`, "")} />
      <SelectField
        name={`${prefix}.sitio`}
        label="Sitio"
        placeholder={purok ? (sitios.length ? "Select sitio" : "No sitios in this purok") : "Select a purok first"}
        options={sitios.map((s) => ({ label: s, value: s }))}
        disabled={disabled || sitios.length === 0}
      />
    </>
  )
}

function PurokSelect({ name, required, disabled, onPurokChange }: { name: string; required?: boolean; disabled?: boolean; onPurokChange: () => void }) {
  const id = useId()
  const settings = useSettings()
  const { field, fieldState } = useField(name)
  return (
    <FormFieldShell label="Purok" htmlFor={id} required={required} error={fieldState.error?.message}>
      <Select
        value={field.value ?? ""}
        onValueChange={(v) => {
          field.onChange(v)
          onPurokChange()
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={fieldState.invalid}>
          <SelectValue placeholder="Select purok" />
        </SelectTrigger>
        <SelectContent>
          {settings.puroks.map((p) => (
            <SelectItem key={p.id} value={p.name}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldShell>
  )
}

/* ----------------------------- Entity pickers ---------------------------- */

export interface EntityOption extends Option {
  keywords?: string
  leading?: React.ReactNode
}

/** Searchable single-select used by resident/household/official/user pickers. */
export function EntityComboboxField({
  name,
  label,
  required,
  description,
  className,
  disabled,
  options,
  placeholder = "Search…",
  emptyText = "No results found.",
}: BaseFieldProps & { options: EntityOption[]; placeholder?: string; emptyText?: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const { field, fieldState } = useField(name)
  const selected = options.find((o) => o.value === field.value)
  return (
    <FormFieldShell label={label} htmlFor={id} required={required} description={description} error={fieldState.error?.message} className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={fieldState.invalid}
            disabled={disabled}
            onBlur={field.onBlur}
            className="h-auto min-h-8 w-full justify-between px-2.5 py-1 font-normal"
          >
            {selected ? (
              <span className="flex min-w-0 items-center gap-2 text-left">
                {selected.leading}
                <span className="min-w-0">
                  <span className="block truncate">{selected.label}</span>
                  {selected.description && <span className="block truncate text-xs text-muted-foreground">{selected.description}</span>}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={`${o.label} ${o.keywords ?? ""} ${o.value}`}
                    onSelect={() => {
                      field.onChange(o.value === field.value && !required ? "" : o.value)
                      setOpen(false)
                    }}
                  >
                    {o.leading}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{o.label}</span>
                      {o.description && <span className="block truncate text-xs text-muted-foreground">{o.description}</span>}
                    </span>
                    <Check className={cn("size-4", o.value === field.value ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FormFieldShell>
  )
}
