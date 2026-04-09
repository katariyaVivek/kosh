import { addDays, differenceInCalendarDays, startOfDay } from "date-fns"

export type RotationState = "off" | "ok" | "due_soon" | "due_today" | "overdue"

type RotationKeyShape = {
  rotationIntervalDays?: number | null
  rotationReminderDays?: number | null
  lastRotatedAt?: string | Date | null
  createdAt?: string | Date | null
}

export type RotationStatus = {
  state: RotationState
  dueAt: Date | null
  daysUntilDue: number | null
}

function toDate(value: string | Date | null | undefined) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getRotationStatus(
  key: RotationKeyShape,
  now: Date = new Date()
): RotationStatus {
  const intervalDays = key.rotationIntervalDays ?? null

  if (!intervalDays || intervalDays <= 0) {
    return { state: "off", dueAt: null, daysUntilDue: null }
  }

  const anchor = toDate(key.lastRotatedAt) ?? toDate(key.createdAt) ?? now
  const dueAt = addDays(startOfDay(anchor), intervalDays)
  const daysUntilDue = differenceInCalendarDays(startOfDay(dueAt), startOfDay(now))
  const reminderDays = key.rotationReminderDays ?? 7

  if (daysUntilDue < 0) {
    return { state: "overdue", dueAt, daysUntilDue }
  }

  if (daysUntilDue === 0) {
    return { state: "due_today", dueAt, daysUntilDue }
  }

  if (daysUntilDue <= reminderDays) {
    return { state: "due_soon", dueAt, daysUntilDue }
  }

  return { state: "ok", dueAt, daysUntilDue }
}

export function needsRotationAttention(state: RotationState) {
  return state === "due_soon" || state === "due_today" || state === "overdue"
}
