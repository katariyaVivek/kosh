"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

export default function SetupPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 rounded-2xl bg-card p-8 shadow-xl">
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
            Set up Kosh
          </h1>
          <p className="text-sm text-muted-foreground">
            Run <code>npm run bootstrap</code> once in this repo. It creates a
            local master key, prepares the SQLite database, and gets the app
            ready to use.
          </p>
        </div>

        <ol className="list-decimal list-inside space-y-2 rounded-lg border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
          <li>Install dependencies with <code>npm install</code></li>
          <li>Run <code>npm run bootstrap</code></li>
          <li>Start the app with <code>npm run dev</code></li>
          <li>Open <code>http://localhost:3000</code></li>
        </ol>

        <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
          If you already created <code>data/master.key</code> or set{" "}
          <code>KOSH_MASTER_KEY</code>, click Continue.
        </div>

        <Button
          onClick={() => router.push("/")}
          className="w-full rounded-lg bg-primary text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
