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

type AddAlertDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  keys: AlertDialogKey[]
}

const ALERT_TYPES = [
  { value: "cost", label: "cost" },
  { value: "calls", label: "calls" },
  { value: "rate_limit", label: "rate_limit" },
] as const

function getThresholdCopy(type: "cost" | "calls" | "rate_limit") {
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

  return {
    label: "Rate limit threshold",
    placeholder: "100",
    step: "1",
  }
}

export function AddAlertDialog({
  open,
  onOpenChange,
  keys,
}: AddAlertDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    apiKeyId: "",
    type: "cost" as "cost" | "calls" | "rate_limit",
    threshold: "",
  })

  const thresholdCopy = getThresholdCopy(form.type)

  const resetForm = () => {
    setForm({
      apiKeyId: "",
      type: "cost",
      threshold: "",
    })
  }

  const handleSubmit = async () => {
    if (!form.apiKeyId || !form.threshold) {
      return
    }

    setLoading(true)

    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKeyId: form.apiKeyId,
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
            <Label>API Key</Label>
            <Select
              value={form.apiKeyId}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, apiKeyId: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select API key" />
              </SelectTrigger>
              <SelectContent>
                {keys.map((key) => (
                  <SelectItem key={key.id} value={key.id}>
                    {key.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Alert type</Label>
            <Select
              value={form.type}
              onValueChange={(value: "cost" | "calls" | "rate_limit") =>
                setForm((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
            disabled={loading || keys.length === 0}
            className="mt-2"
          >
            {loading ? "Saving..." : "Save alert"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
