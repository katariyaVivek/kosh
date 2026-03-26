"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const PLATFORMS = ["OpenAI", "Anthropic", "Google", "Stripe", "Twilio", "Other"]
const ENVIRONMENTS = ["production", "development", "staging"]

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

const MASKED_EDIT_VALUE = "••••••••••••••••"

export function AddKeyDialog({
  open,
  onOpenChange,
  mode = "add",
  initialValues,
}: AddKeyDialogProps) {
  const router = useRouter()
  const isEditMode = mode === "edit"
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: initialValues?.name ?? "",
    platform: initialValues?.platform ?? "",
    keyValue: "",
    projectTag: initialValues?.projectTag ?? "",
    environment: initialValues?.environment ?? "production",
  })

  const handleSubmit = async () => {
    if (!form.name || !form.platform || (!isEditMode && !form.keyValue)) return

    setLoading(true)

    const payload = isEditMode
      ? {
          name: form.name,
          platform: form.platform,
          projectTag: form.projectTag,
          environment: form.environment,
        }
      : form

    const res = await fetch(isEditMode ? `/api/keys/${initialValues?.id}` : "/api/keys", {
      method: isEditMode ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    setLoading(false)

    if (!res.ok) {
      return
    }

    onOpenChange(false)
    setForm({ name: "", platform: "", keyValue: "", projectTag: "", environment: "production" })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit API key" : "Add API key"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input placeholder="e.g. OpenAI Production" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Platform</Label>
            <Select value={form.platform} onValueChange={v => setForm(p => ({ ...p, platform: v }))}>
              <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>API Key</Label>
            <Input
              placeholder="sk-..."
              value={isEditMode ? MASKED_EDIT_VALUE : form.keyValue}
              disabled={isEditMode}
              onChange={e => setForm(p => ({ ...p, keyValue: e.target.value }))}
            />
            {isEditMode ? (
              <p className="text-xs text-muted-foreground">
                Key value cannot be changed after saving.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Project tag <span className="text-muted-foreground">(optional)</span></Label>
            <Input placeholder="e.g. kosh, side-project" value={form.projectTag}
              onChange={e => setForm(p => ({ ...p, projectTag: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Environment</Label>
            <Select value={form.environment} onValueChange={v => setForm(p => ({ ...p, environment: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENVIRONMENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
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
