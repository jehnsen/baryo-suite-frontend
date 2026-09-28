"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { BarangaySettings, IncidentType } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileField, FormRoot, FormSection, OfficialSelectField, TextField } from "@/components/forms"
import { ContentTabs } from "@/components/shared/content-tabs"
import { EditableList } from "@/components/shared/editable-list"
import { LoadState } from "@/components/shared/load-state"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { TagBadge } from "@/components/shared/status-badge"
import { TableSkeleton } from "@/components/shared/loading-skeleton"
import { useResidents, useSettings } from "@/hooks/use-data"
import { usePageLoad } from "@/hooks/use-page-load"
import { CLASSIFICATION_LABELS } from "@/lib/constants"
import { formatPeso } from "@/lib/format"
import { settingsActions, simulateLatency } from "@/lib/store/actions"
import { optionalEmail, requiredText, selectRequired } from "@/lib/validation"

/* ------------------------------ Profile form ----------------------------- */

const profileSchema = z.object({
  barangayName: requiredText("Barangay name", 80),
  barangayCode: z.string().regex(/^\d{9,10}$/, "PSGC code must be 9–10 digits"),
  municipality: requiredText("Municipality / City", 80),
  province: requiredText("Province", 80),
  region: requiredText("Region", 80),
  address: requiredText("Office address", 200),
  contactNumber: requiredText("Contact number", 30),
  email: optionalEmail,
  logo: z.array(z.object({ id: z.string(), name: z.string(), size: z.number(), type: z.string() })),
  seal: z.array(z.object({ id: z.string(), name: z.string(), size: z.number(), type: z.string() })),
})

function SaveBar({ pending, dirty }: { pending: boolean; dirty: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t pt-4">
      {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
      <Button type="submit" disabled={pending || !dirty}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />} Save changes
      </Button>
    </div>
  )
}

function ProfileForm({ settings }: { settings: BarangaySettings }) {
  const defaults = {
    barangayName: settings.barangayName,
    barangayCode: settings.barangayCode,
    municipality: settings.municipality,
    province: settings.province,
    region: settings.region,
    address: settings.address,
    contactNumber: settings.contactNumber,
    email: settings.email,
    logo: [],
    seal: [],
  }
  const form = useForm({ resolver: zodResolver(profileSchema), defaultValues: defaults, mode: "onTouched" })
  const onSubmit = async (v: z.output<typeof profileSchema>) => {
    await simulateLatency()
    const { logo: _logo, seal: _seal, ...rest } = v
    settingsActions.update(rest, "Barangay profile")
    form.reset(v)
    toast.success("Barangay profile saved", { description: "Certificates will use the updated letterhead." })
  }
  return (
    <SectionCard title="Barangay profile" description="Printed on certificate letterheads and reports.">
      <FormRoot id="profile-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <TextField name="barangayName" label="Barangay name" required />
          <TextField name="barangayCode" label="Barangay code (PSGC)" required />
          <TextField name="municipality" label="Municipality / City" required />
          <TextField name="province" label="Province" required />
          <TextField name="region" label="Region" required />
          <TextField name="contactNumber" label="Contact number" required />
          <TextField name="address" label="Office address" required className="sm:col-span-2" />
          <TextField name="email" label="Email" type="email" />
        </FormSection>
        <FormSection title="Branding">
          <FileField name="logo" label="Barangay logo" accept="image/*" multiple={false} description="Square PNG, at least 300×300 px." />
          <FileField name="seal" label="Barangay seal" accept="image/*" multiple={false} description="Transparent PNG preferred." />
        </FormSection>
        <SaveBar pending={form.formState.isSubmitting} dirty={form.formState.isDirty} />
      </FormRoot>
    </SectionCard>
  )
}

/* ------------------------------- Signatories ----------------------------- */

const signatorySchema = z.object({
  punongBarangayId: selectRequired("Punong Barangay"),
  secretaryId: selectRequired("Secretary"),
  treasurerId: selectRequired("Treasurer"),
})

function SignatoriesForm({ settings }: { settings: BarangaySettings }) {
  const form = useForm({
    resolver: zodResolver(signatorySchema),
    defaultValues: { punongBarangayId: settings.punongBarangayId, secretaryId: settings.secretaryId, treasurerId: settings.treasurerId },
  })
  const onSubmit = async (v: z.output<typeof signatorySchema>) => {
    await simulateLatency()
    settingsActions.update(v, "Signatories")
    form.reset(v)
    toast.success("Signatories updated")
  }
  return (
    <SectionCard title="Officials & signatories" description="Used as default signatories on certificates and as the default issuing officer.">
      <FormRoot id="signatory-form" form={form} onSubmit={onSubmit}>
        <FormSection columns={1}>
          <OfficialSelectField name="punongBarangayId" label="Punong Barangay" required />
          <OfficialSelectField name="secretaryId" label="Barangay Secretary" required />
          <OfficialSelectField name="treasurerId" label="Barangay Treasurer" required />
        </FormSection>
        <SaveBar pending={form.formState.isSubmitting} dirty={form.formState.isDirty} />
      </FormRoot>
    </SectionCard>
  )
}

/* ------------------------------- Master data ----------------------------- */

function PuroksEditor({ settings }: { settings: BarangaySettings }) {
  const residents = useResidents()
  const [newPurok, setNewPurok] = useState("")
  const inUse = new Set(residents.map((r) => r.address.purok))

  const update = (puroks: BarangaySettings["puroks"], msg: string) => {
    settingsActions.update({ puroks }, "Puroks & sitios")
    toast.success(msg)
  }

  return (
    <SectionCard title="Puroks & sitios" description="Puroks with registered residents cannot be removed.">
      <div className="space-y-4">
        <ul className="divide-y rounded-lg border">
          {settings.puroks.map((p) => (
            <li key={p.id} className="grid gap-3 p-3 sm:grid-cols-[160px_1fr_auto] sm:items-start">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{residents.filter((r) => r.address.purok === p.name).length} residents</p>
              </div>
              <EditableList
                items={p.sitios}
                placeholder="Add sitio"
                onChange={(sitios) =>
                  update(
                    settings.puroks.map((x) => (x.id === p.id ? { ...x, sitios } : x)),
                    `Sitios updated for ${p.name}`,
                  )
                }
              />
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={inUse.has(p.name)}
                aria-label={`Remove ${p.name}`}
                onClick={() =>
                  update(
                    settings.puroks.filter((x) => x.id !== p.id),
                    `${p.name} removed`,
                  )
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="flex max-w-sm gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const name = newPurok.trim()
            if (!name || settings.puroks.some((p) => p.name.toLowerCase() === name.toLowerCase())) return
            update([...settings.puroks, { id: `prk-${Date.now()}`, name, sitios: [] }], `${name} added`)
            setNewPurok("")
          }}
        >
          <Input value={newPurok} onChange={(e) => setNewPurok(e.target.value)} placeholder="e.g. Purok 8" aria-label="New purok name" />
          <Button type="submit" variant="outline" disabled={!newPurok.trim()}>
            <Plus /> Add purok
          </Button>
        </form>
      </div>
    </SectionCard>
  )
}

function CertificateTypesEditor({ settings }: { settings: BarangaySettings }) {
  const [rows, setRows] = useState(settings.certificateTypes)
  const [pending, setPending] = useState(false)
  const dirty = JSON.stringify(rows) !== JSON.stringify(settings.certificateTypes)
  const invalid = rows.some((r) => !Number.isFinite(r.fee) || r.fee < 0 || !Number.isInteger(r.validityDays) || r.validityDays <= 0)

  return (
    <SectionCard title="Certificate types" description="Fees and validity are applied automatically when issuing certificates." contentClassName="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Certificate type</TableHead>
              <TableHead className="w-36 text-xs">Fee (₱)</TableHead>
              <TableHead className="w-36 text-xs">Validity (days)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.type}>
                <TableCell className="font-medium">
                  {r.type}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{r.fee === 0 ? "Free" : formatPeso(r.fee)}</span>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={Number.isNaN(r.fee) ? "" : r.fee}
                    aria-label={`${r.type} fee`}
                    aria-invalid={r.fee < 0}
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, fee: e.target.valueAsNumber } : x)))}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={Number.isNaN(r.validityDays) ? "" : r.validityDays}
                    aria-label={`${r.type} validity`}
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, validityDays: e.target.valueAsNumber } : x)))}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {invalid && <p className="text-xs text-destructive">Fees must be 0 or more and validity must be a whole number of days.</p>}
      <div className="flex justify-end gap-2">
        {dirty && (
          <Button variant="ghost" onClick={() => setRows(settings.certificateTypes)}>
            Discard
          </Button>
        )}
        <Button
          disabled={!dirty || invalid || pending}
          onClick={async () => {
            setPending(true)
            await simulateLatency()
            settingsActions.update({ certificateTypes: rows }, "Certificate types")
            setPending(false)
            toast.success("Certificate types saved")
          }}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save changes
        </Button>
      </div>
    </SectionCard>
  )
}

export function SettingsView() {
  const load = usePageLoad()
  const settings = useSettings()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Barangay profile, signatories and master data."
        breadcrumbs={[{ label: "Administration" }, { label: "Settings" }]}
      />
      <LoadState load={load} skeleton={<TableSkeleton rows={6} columns={3} />}>
        <ContentTabs
          tabs={[
            { value: "profile", label: "Barangay Profile", content: <ProfileForm settings={settings} /> },
            { value: "officials", label: "Signatories", content: <SignatoriesForm settings={settings} /> },
            {
              value: "master",
              label: "Master Data",
              content: (
                <div className="space-y-4">
                  <PuroksEditor settings={settings} />
                  <CertificateTypesEditor settings={settings} />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <SectionCard title="Incident types" description="Options available when recording incidents.">
                      <EditableList
                        items={settings.incidentTypes}
                        placeholder="Add incident type"
                        onChange={(items) => {
                          settingsActions.update({ incidentTypes: items as IncidentType[] }, "Incident types")
                          toast.success("Incident types updated")
                        }}
                        locked={["Other"]}
                      />
                    </SectionCard>
                    <SectionCard title="Resident classifications" description="Sectoral classifications tracked for every resident.">
                      <div className="flex flex-wrap gap-1.5">
                        {settings.classifications.map((c) => (
                          <TagBadge key={c} className="h-7 px-2.5 text-sm">
                            {CLASSIFICATION_LABELS[c]}
                          </TagBadge>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Custom classifications (e.g. 4Ps beneficiary, IP) can be added once the resident schema is served by the API.
                      </p>
                    </SectionCard>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </LoadState>
    </div>
  )
}
