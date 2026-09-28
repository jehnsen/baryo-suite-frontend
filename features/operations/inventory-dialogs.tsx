"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { InventoryCategory, InventoryItem, InventoryTransactionType } from "@/types"
import { FormRoot, FormSection, SelectField, TextField, TextareaField, type EntityFormProps } from "@/components/forms"
import { FormDialog } from "@/components/shared/form-dialog"
import { INVENTORY_CATEGORIES, toOptions } from "@/lib/constants"
import { simulateLatency } from "@/lib/store/actions"
import { inventoryActions } from "@/lib/store/operations-actions"
import { optionalText, requiredText, selectRequired } from "@/lib/validation"
import type { StockLevel } from "./use-inventory"

const itemSchema = z.object({
  name: requiredText("Item name", 120),
  category: selectRequired("Category"),
  unit: requiredText("Unit", 20),
  reorderLevel: z.string().regex(/^\d+$/, "Enter a whole number"),
  location: requiredText("Storage location", 80),
  opening: z.string().regex(/^\d*$/, "Enter a whole number"),
})

export function InventoryItemFormDialog({ open, onOpenChange, record }: EntityFormProps<InventoryItem>) {
  const form = useForm({
    resolver: zodResolver(itemSchema),
    mode: "onTouched",
    defaultValues: {
      name: record?.name ?? "",
      category: record?.category ?? "",
      unit: record?.unit ?? "piece",
      reorderLevel: String(record?.reorderLevel ?? 5),
      location: record?.location ?? "",
      opening: "",
    },
  })
  const onSubmit = async (v: z.output<typeof itemSchema>) => {
    await simulateLatency(350)
    const payload = { name: v.name, category: v.category as InventoryCategory, unit: v.unit, reorderLevel: Number(v.reorderLevel), location: v.location }
    if (record) inventoryActions.updateItem(record.id, payload)
    else inventoryActions.createItem(payload, Number(v.opening || 0))
    toast.success(record ? "Item updated" : "Item added", { description: v.name })
    onOpenChange(false)
  }
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit ${record.code}` : "Add inventory item"}
      formId="inventory-item-form"
      submitLabel="Save"
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="inventory-item-form" form={form} onSubmit={onSubmit}>
        <FormSection>
          <TextField name="name" label="Item name" required className="sm:col-span-2" />
          <SelectField name="category" label="Category" required options={toOptions(INVENTORY_CATEGORIES)} />
          <TextField name="unit" label="Unit" required placeholder="ream, box, piece…" />
          <TextField name="reorderLevel" label="Reorder level" type="number" required />
          <TextField name="location" label="Storage location" required />
          {!record && <TextField name="opening" label="Opening quantity" type="number" description="Recorded as a Stock In transaction." />}
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}

/** Stock In / Stock Out / Adjustment for one item — validates against quantity on hand. */
export function InventoryTransactionDialog({
  item,
  type,
  open,
  onOpenChange,
}: {
  item: StockLevel | null
  type: InventoryTransactionType
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const onHand = item?.onHand ?? 0
  const schema = z
    .object({
      direction: z.enum(["add", "remove"]),
      quantity: z.string().regex(/^[1-9]\d*$/, "Enter a quantity greater than zero"),
      issuedTo: optionalText(120),
      reference: optionalText(80),
      remarks: optionalText(300),
    })
    .refine((v) => !(type === "Stock Out" || (type === "Adjustment" && v.direction === "remove")) || Number(v.quantity) <= onHand, {
      path: ["quantity"],
      message: `Only ${onHand} on hand`,
    })
    .refine((v) => type !== "Stock Out" || Boolean(v.issuedTo), { path: ["issuedTo"], message: "Enter who received the items" })
    .refine((v) => type !== "Adjustment" || Boolean(v.remarks), { path: ["remarks"], message: "Explain the adjustment" })

  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    values: { direction: "remove" as "add" | "remove", quantity: "", issuedTo: "", reference: "", remarks: "" },
  })
  const direction = useWatch({ control: form.control, name: "direction" })

  const onSubmit = async (v: z.output<typeof schema>) => {
    if (!item) return
    await simulateLatency(350)
    const qty = Number(v.quantity)
    inventoryActions.transact(item.id, type, type === "Adjustment" && v.direction === "remove" ? -qty : qty, {
      issuedTo: v.issuedTo || undefined,
      reference: v.reference || undefined,
      remarks: v.remarks || undefined,
    })
    toast.success(`${type} recorded`, {
      description: `${item.name}: ${type === "Stock Out" || (type === "Adjustment" && direction === "remove") ? "−" : "+"}${qty} ${item.unit}`,
    })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={type}
      description={item ? `${item.code} · ${item.name} · ${onHand} ${item.unit} on hand` : undefined}
      formId="inventory-tx-form"
      submitLabel={`Record ${type.toLowerCase()}`}
      isSubmitting={form.formState.isSubmitting}
    >
      <FormRoot id="inventory-tx-form" form={form} onSubmit={onSubmit}>
        <FormSection columns={1}>
          {type === "Adjustment" && (
            <SelectField
              name="direction"
              label="Adjustment"
              required
              options={[
                { label: "Decrease (damaged, expired, lost)", value: "remove" },
                { label: "Increase (count found more)", value: "add" },
              ]}
            />
          )}
          <TextField name="quantity" label={`Quantity (${item?.unit ?? "units"})`} type="number" required />
          {type === "Stock Out" && <TextField name="issuedTo" label="Issued to" required placeholder="Office, program or person" />}
          <TextField name="reference" label={type === "Stock In" ? "Delivery / PO reference" : "RIS / reference no."} />
          <TextareaField name="remarks" label="Remarks" required={type === "Adjustment"} rows={2} />
        </FormSection>
      </FormRoot>
    </FormDialog>
  )
}
