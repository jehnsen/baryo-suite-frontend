import type {
  Asset,
  AssetCondition,
  InventoryItem,
  InventoryTransaction,
  InventoryTransactionType,
  MaintenanceRecord,
  Project,
  ProjectMilestone,
  ProjectStatus,
} from "@/types"
import { formatPeso, fullName } from "@/lib/format"
import { appendAttachments, currentUserId, get, log, newId, nextNumber, patchIn, set, statusEntry, today } from "./helpers"

/* Operations mutations: projects, assets, inventory. */

export type ProjectInput = Omit<Project, "id" | "code" | "status" | "history" | "milestones" | "attachments" | "physicalProgress" | "actualCompletion">

export const projectActions = {
  create(input: ProjectInput): Project {
    const p: Project = {
      ...input,
      id: newId("prj"),
      code: nextNumber(
        get().projects.map((x) => x.code),
        "PRJ",
        3,
      ),
      status: "Planning",
      physicalProgress: 0,
      milestones: [],
      attachments: [],
      history: [statusEntry<ProjectStatus>("Planning")],
    }
    set((s) => ({ ...s, projects: [p, ...s.projects] }))
    log("Created", "Projects", `${p.code} – ${p.name}`, "Project created.", p.id)
    return p
  },
  update(id: string, patch: Partial<Project>) {
    patchIn<"projects", Project>("projects", id, (p) => ({ ...p, ...patch }))
    const p = get().projects.find((x) => x.id === id)
    log(
      "Updated",
      "Projects",
      `${p?.code} – ${p?.name}`,
      patch.physicalProgress !== undefined ? `Physical progress updated to ${patch.physicalProgress}%.` : "Project details updated.",
      id,
    )
  },
  transition(id: string, to: ProjectStatus, remarks?: string) {
    const p = get().projects.find((x) => x.id === id)
    patchIn<"projects", Project>("projects", id, (x) => ({
      ...x,
      status: to,
      physicalProgress: to === "Completed" ? 100 : x.physicalProgress,
      actualCompletion: to === "Completed" ? today() : x.actualCompletion,
      history: [...x.history, statusEntry(to, remarks)],
    }))
    log(
      to === "Approved" ? "Approved" : to === "Cancelled" ? "Cancelled" : "Status Changed",
      "Projects",
      `${p?.code} – ${p?.name}`,
      `Project moved to ${to}.${remarks ? " " + remarks : ""}`,
      id,
    )
  },
  saveMilestone(projectId: string, milestone: Omit<ProjectMilestone, "id"> & { id?: string }) {
    patchIn<"projects", Project>("projects", projectId, (p) => {
      const exists = milestone.id && p.milestones.some((m) => m.id === milestone.id)
      const milestones = exists
        ? p.milestones.map((m) => (m.id === milestone.id ? ({ ...m, ...milestone } as ProjectMilestone) : m))
        : [...p.milestones, { ...milestone, id: newId("ms") }]
      return { ...p, milestones: milestones.sort((a, b) => a.targetDate.localeCompare(b.targetDate)) }
    })
    const p = get().projects.find((x) => x.id === projectId)
    log(
      "Updated",
      "Projects",
      `${p?.code} – ${p?.name}`,
      `Milestone "${milestone.title}" ${milestone.id ? "updated" : "added"} (${milestone.progress}%).`,
      projectId,
    )
  },
  addAttachments: (id: string, files: Parameters<typeof appendAttachments>[2]) => appendAttachments("projects", id, files),
}

export type AssetInput = Omit<Asset, "id" | "assetNumber" | "maintenance" | "conditionHistory" | "attachments">

const officialName = (id: string) => fullName(get().officials.find((o) => o.id === id))

export const assetActions = {
  create(input: AssetInput): Asset {
    const a: Asset = {
      ...input,
      id: newId("ast"),
      assetNumber: nextNumber(
        get().assets.map((x) => x.assetNumber),
        "SRQ",
      ),
      maintenance: [],
      conditionHistory: [{ date: today(), condition: input.condition, remarks: "Registered in asset registry.", byUserId: currentUserId() }],
      attachments: [],
    }
    set((s) => ({ ...s, assets: [a, ...s.assets] }))
    log("Created", "Assets", `${a.assetNumber} – ${a.name}`, `Registered (${formatPeso(a.acquisitionCost)}); custodian ${officialName(a.custodianId)}.`, a.id)
    return a
  },
  update(id: string, patch: Partial<Asset>) {
    patchIn<"assets", Asset>("assets", id, (a) => ({ ...a, ...patch }))
    log("Updated", "Assets", get().assets.find((a) => a.id === id)?.assetNumber ?? id, "Asset details updated.", id)
  },
  assign(id: string, custodianId: string, location: string, remarks?: string) {
    patchIn<"assets", Asset>("assets", id, (a) => ({ ...a, custodianId, location }))
    const a = get().assets.find((x) => x.id === id)
    log("Assigned", "Assets", `${a?.assetNumber} – ${a?.name}`, `Assigned to ${officialName(custodianId)} at ${location}.${remarks ? " " + remarks : ""}`, id)
  },
  recordCondition(id: string, condition: AssetCondition, remarks?: string) {
    patchIn<"assets", Asset>("assets", id, (a) => ({
      ...a,
      condition,
      status:
        condition === "For Repair" ? "Under Maintenance" : condition === "Unserviceable" ? a.status : a.status === "Under Maintenance" ? "Active" : a.status,
      conditionHistory: [...a.conditionHistory, { date: today(), condition, remarks, byUserId: currentUserId() }],
    }))
    log("Updated", "Assets", get().assets.find((a) => a.id === id)?.assetNumber ?? id, `Condition set to ${condition}.${remarks ? " " + remarks : ""}`, id)
  },
  addMaintenance(id: string, record: Omit<MaintenanceRecord, "id">) {
    patchIn<"assets", Asset>("assets", id, (a) => ({ ...a, maintenance: [{ ...record, id: newId("mnt") }, ...a.maintenance] }))
    log(
      "Updated",
      "Assets",
      get().assets.find((a) => a.id === id)?.assetNumber ?? id,
      `${record.type}: ${record.description} (${formatPeso(record.cost)}).`,
      id,
    )
  },
  dispose(id: string, remarks: string) {
    patchIn<"assets", Asset>("assets", id, (a) => ({
      ...a,
      status: "Disposed",
      condition: "Unserviceable",
      conditionHistory: [...a.conditionHistory, { date: today(), condition: "Unserviceable", remarks: `Disposed: ${remarks}`, byUserId: currentUserId() }],
    }))
    log("Archived", "Assets", get().assets.find((a) => a.id === id)?.assetNumber ?? id, `Asset disposed. ${remarks}`, id)
  },
  addAttachments: (id: string, files: Parameters<typeof appendAttachments>[2]) => appendAttachments("assets", id, files),
}

export type InventoryItemInput = Omit<InventoryItem, "id" | "code">

const CATEGORY_PREFIX: Record<InventoryItem["category"], string> = {
  "Office Supplies": "OFS",
  "Cleaning Supplies": "CLN",
  "Relief Supplies": "RLF",
  "Medical Supplies": "MED",
  "Maintenance Supplies": "MNT",
}

export const inventoryActions = {
  createItem(input: InventoryItemInput, openingQuantity = 0): InventoryItem {
    const count = get().inventoryItems.length + 1
    const item: InventoryItem = { ...input, id: newId("inv"), code: `${CATEGORY_PREFIX[input.category]}-${String(count).padStart(3, "0")}` }
    set((s) => ({ ...s, inventoryItems: [...s.inventoryItems, item] }))
    log("Created", "Inventory", `${item.code} – ${item.name}`, "Item added to inventory.", item.id)
    if (openingQuantity > 0) inventoryActions.transact(item.id, "Stock In", openingQuantity, { reference: "Opening balance" })
    return item
  },
  updateItem(id: string, patch: Partial<InventoryItem>) {
    patchIn<"inventoryItems", InventoryItem>("inventoryItems", id, (i) => ({ ...i, ...patch }))
    log("Updated", "Inventory", get().inventoryItems.find((i) => i.id === id)?.code ?? id, "Item details updated.", id)
  },
  transact(itemId: string, type: InventoryTransactionType, quantity: number, details: Pick<InventoryTransaction, "reference" | "issuedTo" | "remarks"> = {}) {
    const tx: InventoryTransaction = { ...details, id: newId("itx"), itemId, type, quantity, date: today(), byUserId: currentUserId() }
    set((s) => ({ ...s, inventoryTransactions: [tx, ...s.inventoryTransactions] }))
    const item = get().inventoryItems.find((i) => i.id === itemId)
    const action = type === "Stock In" ? "Stock In" : type === "Stock Out" ? "Stock Out" : "Adjusted"
    const qty = `${type === "Adjustment" && quantity > 0 ? "+" : ""}${quantity} ${item?.unit}`
    log(action, "Inventory", `${item?.code} – ${item?.name}`, `${type}: ${qty}${details.issuedTo ? ` to ${details.issuedTo}` : ""}.`, itemId)
  },
}
