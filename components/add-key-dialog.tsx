"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ConnectorInfo } from "@/lib/connectors/types"

const ENVIRONMENTS = ["production", "development", "staging"]
const MASKED_EDIT_VALUE = "****************"
const ROTATION_INTERVAL_OPTIONS = [
  { value: "none", label: "No rotation reminder" },
  { value: "30", label: "Every 30 days" },
  { value: "60", label: "Every 60 days" },
  { value: "90", label: "Every 90 days" },
  { value: "180", label: "Every 180 days" },
]
const ROTATION_REMINDER_OPTIONS = [
  { value: "1", label: "1 day before" },
  { value: "3", label: "3 days before" },
  { value: "7", label: "7 days before" },
  { value: "14", label: "14 days before" },
]

type KeyDialogValues = {
  id?: string
  name: string
  platform: string
  projectTag: string | null
  environment: string
  notes?: string | null
  rotationIntervalDays?: number | null
  rotationReminderDays?: number
}

type AddKeyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "add" | "edit"
  initialValues?: KeyDialogValues
}

function getInitialFormState(initialValues?: KeyDialogValues) {
  return {
    name: initialValues?.name ?? "",
    platform: initialValues?.platform ?? "",
    keyValue: "",
    projectTag: initialValues?.projectTag ?? "",
    environment: initialValues?.environment ?? "production",
    notes: initialValues?.notes ?? "",
    rotationIntervalDays: initialValues?.rotationIntervalDays
      ? String(initialValues.rotationIntervalDays)
      : "none",
    rotationReminderDays: String(initialValues?.rotationReminderDays ?? 7),
  }
}

function getPlatformIndicator(platform: ConnectorInfo) {
  if (platform.canSync) {
    return platform.capabilities.accuracy === "provider_aggregate"
      ? "Provider aggregate"
      : "Usage sync"
  }

  if (platform.canValidate) {
    return "Validation only"
  }

  return "Manual"
}

export function AddKeyDialog({
  open,
  onOpenChange,
  mode = "add",
  initialValues,
}: AddKeyDialogProps) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const isEditMode = mode === "edit"
  const [loading, setLoading] = useState(false)
  const [platforms, setPlatforms] = useState<ConnectorInfo[]>([])
  const [form, setForm] = useState(() => getInitialFormState(initialValues))

  useEffect(() => {
    let cancelled = false

    const loadPlatforms = async () => {
      const response = await fetch("/api/connectors", {
        cache: "no-store",
      }).catch(() => null)

      if (!response?.ok) {
        return
      }

      const data = (await response.json().catch(() => [])) as ConnectorInfo[]

      if (!cancelled) {
        setPlatforms(Array.isArray(data) ? data : [])
      }
    }

    loadPlatforms()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async () => {
    if (!form.name || !form.platform || (!isEditMode && !form.keyValue)) {
      return
    }

    const rotationIntervalDays =
      form.rotationIntervalDays === "none"
        ? null
        : Number(form.rotationIntervalDays)
    const rotationReminderDays = Number(form.rotationReminderDays)

    setLoading(true)

    const payload = isEditMode
      ? {
          name: form.name,
          platform: form.platform,
          projectTag: form.projectTag,
          environment: form.environment,
          notes: form.notes || null,
          rotationIntervalDays,
          rotationReminderDays,
        }
      : {
          ...form,
          rotationIntervalDays,
          rotationReminderDays,
        }

    const response = await fetch(
      isEditMode ? `/api/keys/${initialValues?.id}` : "/api/keys",
      {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )

    setLoading(false)

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      toastError(
        isEditMode ? "Update failed" : "Create failed",
        data?.message ?? "Something went wrong"
      )
      return
    }

    success(
      isEditMode ? "Key updated" : "Key created",
      isEditMode ? "The key has been updated" : "The key has been added"
    )

    // Trigger celebration for first key
    if (!isEditMode) {
      window.dispatchEvent(new CustomEvent("kosh:celebrate"))
    }

    onOpenChange(false)
    setForm(getInitialFormState())
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setForm(getInitialFormState(initialValues))
        }

        if (!nextOpen && !loading) {
          setForm(getInitialFormState())
        }

        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit API key" : "Add API key"}</DialogTitle>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input
              placeholder="e.g. OpenAI Production"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Platform</Label>
            <Select
              value={form.platform}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, platform: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((platform) => (
                  <SelectItem key={platform.platform} value={platform.platform}>
                    <div className="flex w-full items-center justify-between gap-4">
                      <span>{platform.platform}</span>
                      <span className="text-micro text-muted-foreground">
                        {getPlatformIndicator(platform)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>API Key</Label>
            <Input
              placeholder="sk-..."
              value={isEditMode ? MASKED_EDIT_VALUE : form.keyValue}
              disabled={isEditMode}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, keyValue: event.target.value }))
              }
            />
            {isEditMode ? (
              <p className="text-xs text-muted-foreground">
                Key value cannot be changed after saving.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              Project tag <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              placeholder="e.g. kosh, side-project"
              value={form.projectTag}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, projectTag: event.target.value }))
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Environment</Label>
            <Select
              value={form.environment}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, environment: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENVIRONMENTS.map((environment) => (
                  <SelectItem key={environment} value={environment}>
                    {environment}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Rotation cadence</Label>
            <Select
              value={form.rotationIntervalDays}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, rotationIntervalDays: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROTATION_INTERVAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.rotationIntervalDays !== "none" ? (
            <div className="flex flex-col gap-1.5">
              <Label>Reminder lead time</Label>
              <Select
                value={form.rotationReminderDays}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, rotationReminderDays: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROTATION_REMINDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              rows={3}
              placeholder="e.g. Used for project X, rate limit 100/min, expires when trial ends..."
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="mt-2">
            {loading ? "Saving..." : isEditMode ? "Save changes" : "Save key"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
