import { z } from "zod"

/** Shared Zod building blocks so every form validates the same way. */

export const requiredText = (label: string, max = 120) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`)

export const optionalText = (max = 500) => z.string().trim().max(max, `Must be at most ${max} characters`)

/** PH mobile: 09XX XXX XXXX (spaces optional). Empty string allowed. */
export const phMobile = z
  .string()
  .trim()
  .refine((v) => v === "" || /^09\d{2}\s?\d{3}\s?\d{4}$/.test(v), "Enter a valid mobile number, e.g. 0917 123 4567")

export const requiredPhMobile = z
  .string()
  .trim()
  .min(1, "Contact number is required")
  .regex(/^09\d{2}\s?\d{3}\s?\d{4}$/, "Enter a valid mobile number, e.g. 0917 123 4567")

export const optionalEmail = z
  .string()
  .trim()
  .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address")

export const isoDate = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is invalid`)

export const optionalIsoDate = z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date")

export const selectRequired = (label: string) => z.string().min(1, `Select ${label.toLowerCase()}`)

export const addressSchema = z.object({
  houseNumber: requiredText("House number", 20),
  street: requiredText("Street", 80),
  sitio: z.string(),
  purok: selectRequired("Purok"),
})

/** Convert empty strings to undefined before persisting. */
export const emptyToUndefined = <T extends string>(v: T | "" | undefined) => (v === "" || v === undefined ? undefined : v)
