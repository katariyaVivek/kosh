"use client"

import { AlertTriangle } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function generateKey(): string {
  const uuid = crypto.randomUUID().replace(/-/g, "")
  let key = uuid + Date.now().toString(16)
  while (key.length < 64) {
    key += crypto.randomUUID().replace(/-/g, "")
  }
  return key.slice(0, 64)
}

export default function SetupPage() {
  const router = useRouter()
  const [masterKey, setMasterKey] = useState(() => generateKey())
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleRegenerate = () => setMasterKey(generateKey())

  const handleCopy = async () => {
    await navigator.clipboard.writeText(masterKey)
    setCopied(true)
    timerRef.current = window.setTimeout(() => setCopied(false), 2000)
  }

  const continueSetup = () => router.push("/")

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto flex w-full max-w-lg flex-col rounded-2xl bg-card p-8 shadow-xl">
        <div className="space-y-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm">
            <Image
              src="/branding/kosh-mark.png"
              alt="Kosh logo"
              width={56}
              height={56}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            🏛️ Welcome to Kosh
          </h1>
          <p className="text-sm text-muted-foreground">
            Your API treasury needs a master key to encrypt your API keys. This
            key is stored in your <code>.env</code> file and never leaves your
            machine.
          </p>
        </div>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
            Generate Master Key
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={masterKey}
              className="flex-1 rounded-lg bg-muted px-4 py-2 text-sm font-mono text-muted-foreground"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRegenerate} className="text-sm">
                Regenerate
              </Button>
              <Button variant="default" size="sm" onClick={handleCopy} className="text-sm">
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </section>

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">
            Add this key to your <code>.env</code> file as <code>KOSH_MASTER_KEY</code>{" "}
            before continuing. Without it, your API keys cannot be encrypted.
          </p>
        </div>

        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Copy the generated key above</li>
          <li>Open your <code>.env</code> file in the project root</li>
          <li>Add: <code>KOSH_MASTER_KEY=&quot;your-copied-key&quot;</code></li>
          <li>Restart the dev server: <code>npm run dev</code></li>
          <li>Click the button below to continue</li>
        </ol>

        <div className="pt-4">
          <Button
            onClick={continueSetup}
            className="w-full rounded-lg bg-primary text-white text-sm font-medium shadow-sm transition-colors hover:bg-primary/90"
          >
            I&apos;ve set my master key →
          </Button>
        </div>
      </div>
    </div>
  )
}
