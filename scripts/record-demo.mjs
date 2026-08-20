import { chromium } from "playwright"
import path from "path"
import fs from "fs"

const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:3000"
const OUTPUT_DIR = path.join(process.cwd(), "recordings")

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5)
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

async function smoothMouseMove(page, targetX, targetY, steps = 28) {
  const start = await page.evaluate(() => {
    return window.__cursorPos || { x: 960, y: 540 }
  }).catch(() => ({ x: 960, y: 540 }))

  const midX = (start.x + targetX) / 2 + (Math.random() - 0.5) * 30
  const midY = (start.y + targetY) / 2 + (Math.random() - 0.5) * 20

  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const u = easeOutQuint(t)
    
    const currentX = (1 - u) * (1 - u) * start.x + 2 * (1 - u) * u * midX + u * u * targetX
    const currentY = (1 - u) * (1 - u) * start.y + 2 * (1 - u) * u * midY + u * u * targetY

    await page.mouse.move(currentX, currentY).catch(() => {})
    await page.evaluate(({ x, y }) => {
      window.__cursorPos = { x, y }
      const dot = document.getElementById("__demo_cursor_dot")
      if (dot) {
        dot.style.left = `${x}px`
        dot.style.top = `${y}px`
      }
    }, { x: currentX, y: currentY }).catch(() => {})

    await sleep(14)
  }
}

async function smoothScroll(page, targetScrollY, durationMs = 800) {
  const startY = await page.evaluate(() => window.scrollY || window.pageYOffset || 0)
  const startTime = Date.now()

  while (Date.now() - startTime < durationMs) {
    const elapsed = Date.now() - startTime
    const t = Math.min(1, elapsed / durationMs)
    const currentY = startY + (targetScrollY - startY) * easeInOutCubic(t)
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), currentY)
    await sleep(16)
  }
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), targetScrollY)
}

async function smoothClick(page, selectorOrBox, { waitAfter = 350 } = {}) {
  let box = null
  if (typeof selectorOrBox === "string") {
    const el = await page.waitForSelector(selectorOrBox, { state: "visible", timeout: 4000 }).catch(() => null)
    if (el) {
      box = await el.boundingBox().catch(() => null)
    }
  } else if (selectorOrBox) {
    if (typeof selectorOrBox.boundingBox === "function") {
      box = await selectorOrBox.boundingBox().catch(() => null)
    } else {
      box = selectorOrBox
    }
  }

  if (box) {
    const targetX = box.x + box.width / 2
    const targetY = box.y + box.height / 2
    await smoothMouseMove(page, targetX, targetY)
    await sleep(180)

    await page.evaluate(({ x, y }) => {
      const ripple = document.createElement("div")
      ripple.className = "__demo_click_ripple"
      ripple.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(139, 92, 246, 0.4);
        border: 2px solid #8b5cf6;
        box-shadow: 0 0 16px rgba(139, 92, 246, 0.8);
        transform: translate(-50%, -50%) scale(0.4);
        pointer-events: none;
        z-index: 9999999;
        transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease-out;
      `
      document.body.appendChild(ripple)
      requestAnimationFrame(() => {
        ripple.style.transform = "translate(-50%, -50%) scale(2.4)"
        ripple.style.opacity = "0"
      })
      setTimeout(() => ripple.remove(), 500)
    }, { x: targetX, y: targetY }).catch(() => {})

    await page.mouse.down().catch(() => {})
    await sleep(90)
    await page.mouse.up().catch(() => {})
    await sleep(waitAfter)
  }
}

async function smoothType(page, text, delayMs = 65) {
  for (const char of text) {
    await page.keyboard.type(char)
    await sleep(delayMs + (Math.random() - 0.5) * 20)
  }
}

async function injectCursorHelper(page) {
  await page.addStyleTag({
    content: `
      #__demo_cursor_dot {
        position: fixed;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #06b6d4;
        border: 2.5px solid #ffffff;
        box-shadow: 0 0 20px rgba(6, 182, 212, 0.9), 0 4px 12px rgba(0,0,0,0.6);
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 9999999;
        transition: transform 0.1s ease-out, background-color 0.2s;
      }
      #__demo_cursor_dot::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        background: rgba(6, 182, 212, 0.25);
        animation: __demo_pulse 2s infinite ease-in-out;
      }
      @keyframes __demo_pulse {
        0%, 100% { transform: scale(1); opacity: 0.4; }
        50% { transform: scale(1.4); opacity: 0.8; }
      }
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 9999px;
      }
    `
  }).catch(() => {})

  await page.evaluate(() => {
    if (!document.getElementById("__demo_cursor_dot")) {
      const dot = document.createElement("div")
      dot.id = "__demo_cursor_dot"
      dot.style.left = "960px"
      dot.style.top = "540px"
      document.body.appendChild(dot)
      window.__cursorPos = { x: 960, y: 540 }
    }
  }).catch(() => {})
}

async function recordProductDemo() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  console.log("\n========================================")
  console.log("🎬 STARTING STUDIO KOSH DEMO RECORDING")
  console.log("========================================\n")

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-infobars",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
    ],
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1920, height: 1080 },
    },
  })

  const page = await context.newPage()

  // ----------------------------------------------------
  // SCENE 1: HERO OVERVIEW & METRICS
  // ----------------------------------------------------
  console.log("▶ [Scene 1] Dashboard Overview & Live Spend...")
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" })
  await injectCursorHelper(page)
  await sleep(1500)

  // Move smoothly across header & metrics
  await smoothMouseMove(page, 960, 260, 35)
  await sleep(600)
  await smoothMouseMove(page, 320, 240, 25)
  await sleep(600)
  await smoothMouseMove(page, 720, 240, 25)
  await sleep(600)

  // ----------------------------------------------------
  // SCENE 2: ANTIGRAVITY LOCAL USAGE IN-DEPTH
  // ----------------------------------------------------
  console.log("▶ [Scene 2] Antigravity Local AI Usage Drawer...")
  const antigravityCard = page.locator("text=Antigravity").first()
  const hasAntigravity = await antigravityCard.count().catch(() => 0)
  if (hasAntigravity > 0) {
    const box = await antigravityCard.boundingBox().catch(() => null)
    if (box) {
      await smoothClick(page, box, { waitAfter: 600 })
      await sleep(1000)

      // Scroll inside drawer
      await smoothMouseMove(page, 1500, 450, 25)
      await sleep(500)
      await smoothMouseMove(page, 1500, 700, 25)
      await sleep(800)

      // Close drawer smoothly
      const closeBtn = page.locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button:has([class*="lucide-x"])').first()
      const hasClose = await closeBtn.count().catch(() => 0)
      if (hasClose > 0) {
        await smoothClick(page, closeBtn, { waitAfter: 500 })
      } else {
        await smoothClick(page, { x: 300, y: 500, width: 20, height: 20 }, { waitAfter: 500 })
      }
    }
  }
  await sleep(600)

  // ----------------------------------------------------
  // SCENE 3: ENCRYPTED KEY VAULT & SEARCH
  // ----------------------------------------------------
  console.log("▶ [Scene 3] Encrypted Key Vault & Fast Search...")
  const vaultLink = page.locator('nav a[href*="/vault"], a:has-text("Vault")').first()
  await smoothClick(page, vaultLink, { waitAfter: 600 })
  await injectCursorHelper(page)
  await sleep(800)

  // Smooth scroll down the keys list
  await smoothScroll(page, 220, 700)
  await sleep(600)

  // Search filter
  const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
  const hasSearch = await searchInput.count().catch(() => 0)
  if (hasSearch > 0) {
    await smoothClick(page, searchInput, { waitAfter: 300 })
    await smoothType(page, "OpenAI", 80)
    await sleep(1000)

    // Unmask secret
    const eyeBtn = page.locator('button:has([class*="lucide-eye"])').first()
    const hasEye = await eyeBtn.count().catch(() => 0)
    if (hasEye > 0) {
      await smoothClick(page, eyeBtn, { waitAfter: 800 })
    }

    // Copy key
    const copyBtn = page.locator('button:has([class*="lucide-copy"])').first()
    const hasCopy = await copyBtn.count().catch(() => 0)
    if (hasCopy > 0) {
      await smoothClick(page, copyBtn, { waitAfter: 800 })
    }

    // Clear search
    await searchInput.fill("")
    await sleep(600)
  }

  // ----------------------------------------------------
  // SCENE 4: PULSE REAL-TIME HEALTH SCANNER
  // ----------------------------------------------------
  console.log("▶ [Scene 4] Pulse Real-time Health Matrix...")
  const pulseLink = page.locator('nav a[href*="/pulse"], a:has-text("Pulse")').first()
  await smoothClick(page, pulseLink, { waitAfter: 700 })
  await injectCursorHelper(page)
  await sleep(900)

  await smoothMouseMove(page, 500, 320, 25)
  await sleep(600)
  await smoothScroll(page, 300, 800)
  await sleep(800)
  await smoothScroll(page, 0, 600)
  await sleep(600)

  // ----------------------------------------------------
  // SCENE 5: GATEWAY UNIVERSAL ENDPOINT
  // ----------------------------------------------------
  console.log("▶ [Scene 5] Universal AI Gateway Hub...")
  const gatewayLink = page.locator('nav a[href*="/gateway"], a:has-text("Gateway")').first()
  await smoothClick(page, gatewayLink, { waitAfter: 700 })
  await injectCursorHelper(page)
  await sleep(900)

  // Move across endpoint URL & hubs
  await smoothMouseMove(page, 700, 240, 25)
  await sleep(700)

  // ----------------------------------------------------
  // SCENE 6: PROVIDERS & MULTI-MODEL ROUTING
  // ----------------------------------------------------
  console.log("▶ [Scene 6] Providers & Orca Multi-Model Routing...")
  const providersSubTab = page.locator('a[href*="/gateway/providers"]:has-text("Providers"), a:has-text("Providers")').first()
  const hasProviders = await providersSubTab.count().catch(() => 0)
  if (hasProviders > 0) {
    await smoothClick(page, providersSubTab, { waitAfter: 800 })
    await injectCursorHelper(page)
    await sleep(900)
    await smoothScroll(page, 200, 600)
    await sleep(800)
  }

  // ----------------------------------------------------
  // SCENE 7: 1-CLICK CLI INTEGRATIONS
  // ----------------------------------------------------
  console.log("▶ [Scene 7] CLI Tools (Cursor, Claude Code, Cline, Codex)...")
  const cliSubTab = page.locator('a[href*="/gateway/cli-tools"]:has-text("CLI Tools"), a:has-text("CLI Tools")').first()
  const hasCli = await cliSubTab.count().catch(() => 0)
  if (hasCli > 0) {
    await smoothClick(page, cliSubTab, { waitAfter: 800 })
    await injectCursorHelper(page)
    await sleep(900)

    // Hover over Cursor & Claude cards
    await smoothMouseMove(page, 450, 360, 25)
    await sleep(600)
    await smoothMouseMove(page, 850, 360, 25)
    await sleep(600)
  }

  // ----------------------------------------------------
  // SCENE 8: REAL-TIME USAGE & TOKEN METRICS
  // ----------------------------------------------------
  console.log("▶ [Scene 8] Real-time Token Logs & Analytics...")
  const usageSubTab = page.locator('a[href*="/gateway/usage"]:has-text("Usage"), a:has-text("Usage")').first()
  const hasUsage = await usageSubTab.count().catch(() => 0)
  if (hasUsage > 0) {
    await smoothClick(page, usageSubTab, { waitAfter: 800 })
    await injectCursorHelper(page)
    await sleep(1000)
    await smoothScroll(page, 250, 700)
    await sleep(1000)
  }

  // Return to Dashboard for a clean finale
  const homeLink = page.locator('nav a[href="/"], a:has-text("Overview"), a:has-text("Kosh")').first()
  const hasHome = await homeLink.count().catch(() => 0)
  if (hasHome > 0) {
    await smoothClick(page, homeLink, { waitAfter: 800 })
    await injectCursorHelper(page)
    await smoothMouseMove(page, 960, 540, 30)
    await sleep(1500)
  }

  console.log("\n✓ All scenes recorded successfully!")

  await page.close()
  await context.close()
  await browser.close()

  // Find and rename the recorded video
  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".webm"))
  const latestWebm = files.find((f) => f.startsWith("page@")) || files[0]
  if (latestWebm) {
    const finalWebm = path.join(OUTPUT_DIR, "kosh_product_demo.webm")
    const src = path.join(OUTPUT_DIR, latestWebm)
    if (src !== finalWebm) {
      if (fs.existsSync(finalWebm)) fs.unlinkSync(finalWebm)
      fs.renameSync(src, finalWebm)
    }

    const stats = fs.statSync(finalWebm)
    console.log(`\n🎉 Studio 1080p 60FPS Video Saved To:`)
    console.log(`   ${finalWebm} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)\n`)
  }
}

recordProductDemo().catch((err) => {
  console.error("Recording error:", err)
  process.exit(1)
})
