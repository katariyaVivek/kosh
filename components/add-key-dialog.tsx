"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

type KeyDialogValues = {
  id?: string
  name: string
  platform: string
  projectTag: string | null
  environment: string
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
  }
}

function getPlatformIndicator(platform: ConnectorInfo) {
  if (platform.canSync) {
    return "↻ Auto-sync"
  }

  if (platform.canValidate) {
    return "✓ Validation"
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

    setLoading(true)

    const payload = isEditMode
      ? {
          name: form.name,
          platform: form.platform,
          projectTag: form.projectTag,
          environment: form.environment,
        }
      : form

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
      return
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
                      <span className="text-[11px] text-muted-foreground">
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

          <Button onClick={handleSubmit} disabled={loading} className="mt-2">
            {loading ? "Saving..." : isEditMode ? "Save changes" : "Save key"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
