"use client"

import { useRouter } from "next/navigation"
import { useForm, useWatch, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { CivilStatus, Gender, HouseholdRelationship, Resident } from "@/types"
import {
  AddressFields,
  DateField,
  FileField,
  FormRoot,
  FormSection,
  HouseholdSelectField,
  PhoneField,
  SelectField,
  SwitchField,
  TextField,
} from "@/components/forms"
import { SectionCard } from "@/components/shared/section-card"
import { CIVIL_STATUSES, CLASSIFICATION_LABELS, GENDERS, RELATIONSHIPS, toOptions } from "@/lib/constants"
import { computeAge, fullName } from "@/lib/format"
import { residentActions, simulateLatency } from "@/lib/store/actions"
import { addressSchema, emptyToUndefined, isoDate, optionalEmail, optionalText, phMobile, requiredText, selectRequired } from "@/lib/validation"

export const residentSchema = z
  .object({
    firstName: requiredText("First name", 60),
    middleName: optionalText(60),
    lastName: requiredText("Last name", 60),
    suffix: optionalText(10),
    birthDate: isoDate("Birth date").refine((v) => v <= new Date().toISOString().slice(0, 10), "Birth date cannot be in the future"),
    birthplace: requiredText("Birthplace", 100),
    gender: selectRequired("Gender"),
    civilStatus: selectRequired("Civil status"),
    nationality: requiredText("Nationality", 40),
    occupation: optionalText(80),
    contactNumber: phMobile,
    email: optionalEmail,
    address: addressSchema,
    yearsOfResidency: z.string().regex(/^\d{1,3}$/, "Enter number of years"),
    householdId: z.string(),
    relationshipToHead: z.string(),
    classification: z.object({
      seniorCitizen: z.boolean(),
      pwd: z.boolean(),
      soloParent: z.boolean(),
      registeredVoter: z.boolean(),
      indigent: z.boolean(),
      student: z.boolean(),
      unemployed: z.boolean(),
    }),
    photo: z.array(z.object({ id: z.string(), name: z.string(), size: z.number(), type: z.string() })),
  })
  .refine((v) => !v.householdId || v.relationshipToHead, { path: ["relationshipToHead"], message: "Select relationship to household head" })

export type ResidentFormValues = z.input<typeof residentSchema>

export function residentFormDefaults(r?: Resident, defaults?: Partial<Resident>): ResidentFormValues {
  const src = r ?? defaults
  return {
    firstName: src?.firstName ?? "",
    middleName: src?.middleName ?? "",
    lastName: src?.lastName ?? "",
    suffix: src?.suffix ?? "",
    birthDate: src?.birthDate ?? "",
    birthplace: src?.birthplace ?? "",
    gender: src?.gender ?? "",
    civilStatus: src?.civilStatus ?? "",
    nationality: src?.nationality ?? "Filipino",
    occupation: src?.occupation ?? "",
    contactNumber: src?.contactNumber ?? "",
    email: src?.email ?? "",
    address: {
      houseNumber: src?.address?.houseNumber ?? "",
      street: src?.address?.street ?? "",
      sitio: src?.address?.sitio ?? "",
      purok: src?.address?.purok ?? "",
    },
    yearsOfResidency: src?.yearsOfResidency !== undefined ? String(src.yearsOfResidency) : "",
    householdId: src?.householdId ?? "",
    relationshipToHead: src?.relationshipToHead ?? "",
    classification: src?.classification ?? {
      seniorCitizen: false,
      pwd: false,
      soloParent: false,
      registeredVoter: false,
      indigent: false,
      student: false,
      unemployed: false,
    },
    photo: [],
  }
}

/** Builds the mutation payload from validated form output. Shared by the create and edit pages. */
export function toResidentPayload(v: z.output<typeof residentSchema>) {
  return {
    firstName: v.firstName,
    middleName: emptyToUndefined(v.middleName),
    lastName: v.lastName,
    suffix: emptyToUndefined(v.suffix),
    birthDate: v.birthDate,
    birthplace: v.birthplace,
    gender: v.gender as Gender,
    civilStatus: v.civilStatus as CivilStatus,
    nationality: v.nationality,
    occupation: emptyToUndefined(v.occupation),
    contactNumber: emptyToUndefined(v.contactNumber),
    email: emptyToUndefined(v.email),
    address: { ...v.address, sitio: emptyToUndefined(v.address.sitio) },
    yearsOfResidency: Number(v.yearsOfResidency),
    householdId: emptyToUndefined(v.householdId),
    relationshipToHead: (emptyToUndefined(v.relationshipToHead) as HouseholdRelationship | undefined) ?? undefined,
    // Senior status is derived from age so it can never drift from the birth date.
    classification: { ...v.classification, seniorCitizen: computeAge(v.birthDate) >= 60 },
  }
}

export function useResidentForm(record?: Resident, defaults?: Partial<Resident>) {
  return useForm({ resolver: zodResolver(residentSchema), defaultValues: residentFormDefaults(record, defaults), mode: "onTouched" })
}

/**
 * Presentational field layout, shared by the create and edit pages. Callers own the
 * surrounding page chrome (header, actions, submit) and the RHF instance/handleSubmit.
 */
export function ResidentFormFields({
  form,
  formId,
  onSubmit,
}: {
  form: UseFormReturn<ResidentFormValues>
  formId: string
  onSubmit: (v: z.output<typeof residentSchema>) => void
}) {
  const birthDate = useWatch({ control: form.control, name: "birthDate" })
  const householdId = useWatch({ control: form.control, name: "householdId" })
  const age = birthDate ? computeAge(birthDate) : undefined

  return (
    <FormRoot id={formId} form={form} onSubmit={onSubmit}>
      <SectionCard>
        <FormSection title="Personal information">
          <TextField name="firstName" label="First name" required autoComplete="given-name" />
          <TextField name="middleName" label="Middle name" autoComplete="additional-name" />
          <TextField name="lastName" label="Last name" required autoComplete="family-name" />
          <TextField name="suffix" label="Suffix" placeholder="Jr., Sr., III" />
          <DateField name="birthDate" label="Birth date" required disableFuture description={age !== undefined ? `${age} years old` : undefined} />
          <TextField name="birthplace" label="Birthplace" required placeholder="e.g. Baliwag, Bulacan" />
          <SelectField name="gender" label="Sex" required options={toOptions(GENDERS)} />
          <SelectField name="civilStatus" label="Civil status" required options={toOptions(CIVIL_STATUSES)} />
          <TextField name="nationality" label="Nationality" required />
          <TextField name="occupation" label="Occupation" placeholder="e.g. Tricycle Driver" />
        </FormSection>
      </SectionCard>

      <SectionCard>
        <FormSection title="Contact">
          <PhoneField name="contactNumber" />
          <TextField name="email" label="Email" type="email" placeholder="name@example.com" autoComplete="email" />
        </FormSection>
      </SectionCard>

      <SectionCard>
        <FormSection title="Address" description="Residential address within the barangay.">
          <AddressFields />
          <TextField name="yearsOfResidency" label="Years of residency" required type="number" placeholder="e.g. 12" />
        </FormSection>
      </SectionCard>

      <SectionCard>
        <FormSection title="Household" description="Optional — residents can also be assigned from the household profile.">
          <HouseholdSelectField name="householdId" />
          <SelectField name="relationshipToHead" label="Relationship to head" options={toOptions(RELATIONSHIPS)} disabled={!householdId} />
        </FormSection>
      </SectionCard>

      <SectionCard>
        <FormSection title="Classification">
          {(Object.keys(CLASSIFICATION_LABELS) as (keyof typeof CLASSIFICATION_LABELS)[]).map((key) => (
            <SwitchField
              key={key}
              name={`classification.${key}`}
              label={CLASSIFICATION_LABELS[key]}
              disabled={key === "seniorCitizen"}
              description={key === "seniorCitizen" ? "Set automatically for residents aged 60+" : undefined}
            />
          ))}
        </FormSection>
      </SectionCard>

      <SectionCard>
        <FormSection title="Photo" columns={1}>
          <FileField
            name="photo"
            label="Resident photo"
            accept="image/*"
            multiple={false}
            description="JPG or PNG. Stored once the document service is connected."
          />
        </FormSection>
      </SectionCard>
    </FormRoot>
  )
}

/** Form instance + submit handler for the create-resident page. */
export function useResidentCreateForm(defaults: Partial<Resident> | undefined, onSaved: (record: Resident) => void) {
  const router = useRouter()
  const form = useResidentForm(undefined, defaults)

  const onSubmit = async (v: z.output<typeof residentSchema>) => {
    await simulateLatency()
    const created = residentActions.create(toResidentPayload(v))
    toast.success("Resident registered", {
      description: `${fullName(created)} · ${created.residentNumber}`,
      action: { label: "View profile", onClick: () => router.push(`/residents/${created.id}`) },
    })
    onSaved(created)
  }

  return { form, onSubmit }
}

/** Form instance + submit handler for the edit-resident page. */
export function useResidentEditForm(record: Resident, onSaved: (record: Resident) => void) {
  const form = useResidentForm(record)

  const onSubmit = async (v: z.output<typeof residentSchema>) => {
    await simulateLatency()
    const payload = toResidentPayload(v)
    residentActions.update(record.id, payload)
    toast.success("Resident updated", { description: fullName(payload) })
    onSaved({ ...record, ...payload })
  }

  return { form, onSubmit }
}
