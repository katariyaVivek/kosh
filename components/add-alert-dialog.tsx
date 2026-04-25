"use client"

import { useState } from "react"
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

type AlertDialogKey = {
  id: string
  name: string
}

type AlertDialogUsageSource = {
  id: string
  name: string
  provider: string | null
}

type AddAlertDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  keys: AlertDialogKey[]
  usageSources: AlertDialogUsageSource[]
}

const ALERT_TYPES = [
  { value: "cost", label: "cost" },
  { value: "calls", label: "calls" },
  { value: "tokens", label: "tokens" },
] as const

type AlertType = "cost" | "calls" | "tokens"

function getThresholdCopy(type: AlertType) {
  if (type === "cost") {
    return {
      label: "Cost threshold (USD)",
      placeholder: "$5.00",
      step: "0.01",
    }
  }

  if (type === "calls") {
    return {
      label: "Calls threshold",
      placeholder: "1000",
      step: "1",
    }
  }

  if (type === "tokens") {
    return {
      label: "Token threshold",
      placeholder: "1000000",
      step: "1",
    }
  }

  return {
    label: "Calls threshold",
    placeholder: "1000",
    step: "1",
  }
}

export function AddAlertDialog({
  open,
  onOpenChange,
  keys,
  usageSources,
}: AddAlertDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    targetId: "",
    type: "cost" as AlertType,
    threshold: "",
  })

  const thresholdCopy = getThresholdCopy(form.type)

  const resetForm = () => {
    setForm({
      targetId: "",
      type: "cost",
      threshold: "",
    })
  }

  const handleSubmit = async () => {
    if (!form.targetId || !form.threshold) {
      return
    }

    setLoading(true)
    const [targetKind, targetId] = form.targetId.split(":")

    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKeyId: targetKind === "key" ? targetId : null,
        usageSourceId: targetKind === "source" ? targetId : null,
        type: form.type,
        threshold: Number(form.threshold),
      }),
    })

    setLoading(false)

    if (!res.ok) {
      return
    }

    onOpenChange(false)
    resetForm()
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          resetForm()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add alert</DialogTitle>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Target</Label>
            <Select
              value={form.targetId}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, targetId: value }))
              }
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-border/70 bg-background/80 px-3">
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent position="popper" className="rounded-xl">
                {keys.map((key) => (
                  <SelectItem key={key.id} value={`key:${key.id}`}>
                    API key: {key.name}
                  </SelectItem>
                ))}
                {usageSources.map((source) => (
                  <SelectItem key={source.id} value={`source:${source.id}`}>
                    Local source: {source.provider ?? source.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Alert type</Label>
            <Select
              value={form.type}
              onValueChange={(value: AlertType) =>
                setForm((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-border/70 bg-background/80 px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="rounded-xl">
                {ALERT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{thresholdCopy.label}</Label>
            <Input
              type="number"
              min="0"
              step={thresholdCopy.step}
              placeholder={thresholdCopy.placeholder}
              value={form.threshold}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  threshold: event.target.value,
                }))
              }
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || (keys.length === 0 && usageSources.length === 0)}
            className="mt-2"
          >
            {loading ? "Saving..." : "Save alert"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
