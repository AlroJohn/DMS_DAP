// Auto-generated mapping of Prisma enums for frontend filters
// Keep labels human readable and values match Prisma enum literals

// --- Enum literal union types (match Prisma enum values) ---
export type DocClassification = 'simple' | 'complex' | 'highly_technical'
export type DocStatus = 'dispatch' | 'intransit' | 'completed' | 'canceled' | 'deleted'

// --- Generic typed option shape used by faceted filters ---
export interface EnumOption<T extends string = string> {
  label: string
  value: T
  icon?: React.ComponentType<{ className?: string }>
}

// --- Typed option arrays ---
export const DOC_CLASSIFICATION_OPTIONS: EnumOption<DocClassification>[] = [
  { label: 'Simple', value: 'simple' },
  { label: 'Complex', value: 'complex' },
  { label: 'Highly technical', value: 'highly_technical' },
]

export const DOC_STATUS_OPTIONS: EnumOption<DocStatus>[] = [
  { label: 'Dispatch', value: 'dispatch' },
  { label: 'In Transit', value: 'intransit' },
  { label: 'Completed', value: 'completed' },
  { label: 'Canceled', value: 'canceled' },
  { label: 'Deleted', value: 'deleted' },
]

// Export a combined object for convenience
export const DOC_ENUMS = {
  classification: DOC_CLASSIFICATION_OPTIONS,
  status: DOC_STATUS_OPTIONS,
}
