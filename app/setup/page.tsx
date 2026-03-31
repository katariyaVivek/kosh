"use client"

import { AlertTriangle } from "lucide-react"
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
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800"
    >
      <div className="w-full max-w-2xl space-y-8 text-slate-900 dark:text-slate-100">
        <h1 className="text-4xl font-bold">🏛️ Welcome to Kosh</h1>
        <p className="text-lg">
          Your API treasury needs a master key to encrypt your API keys. This
          key is stored in your <code>.env</code> file and never leaves your
          machine.
        </p>

        <section className="space-y-3">
          <label className="text-sm font-medium">Generate Master Key</label>
          <div className="flex items-center gap-2">
            <Input readOnly value={masterKey} className="flex-1" />
            <Button variant="outline" size="sm" onClick={handleRegenerate}>
              Regenerate
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </section>

        <div className="flex items-start gap-2 rounded-lg border border-amber-400/50 bg-amber-400/10 p-4 text-amber-900">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">
            Add this key to your <code>.env</code> file as <code>KOSH_MASTER_KEY</code>{" "}
            before continuing. Without it, your API keys cannot be encrypted.
          </p>
        </div>

        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Copy the generated key above</li>
          <li>Open your <code>.env</code> file in the project root</li>
          <li>Add: <code>KOSH_MASTER_KEY=&quot;your-copied-key&quot;</code></li>
          <li>Restart the dev server: <code>npm run dev</code></li>
          <li>Click the button below to continue</li>
        </ol>

        <div className="pt-4">
          <Button onClick={continueSetup} className="w-full">
            I&apos;ve set my master key →
          </Button>
        </div>
      </div>
    </div>
  )
}
