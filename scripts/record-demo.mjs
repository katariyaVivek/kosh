import { chromium } from "playwright"
import path from "path"
import fs from "fs"

const BASE_URL = process.env.DEMO_BASE_URL || "http://localhost:3000"
const OUTPUT_DIR = path.join(process.cwd(), "recordings")

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function smoothMouseMove(page, targetX, targetY, steps = 18) {
  const start = await page.evaluate(() => {
    return window.__cursorPos || { x: 960, y: 540 }
  }).catch(() => ({ x: 960, y: 540 }))

  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const ease = 1 - Math.pow(1 - t, 3)
    const currentX = start.x + (targetX - start.x) * ease
    const currentY = start.y + (targetY - start.y) * ease

    await page.mouse.move(currentX, currentY).catch(() => {})
    await page.evaluate(({ x, y }) => {
      window.__cursorPos = { x, y }
      const dot = document.getElementById("__demo_cursor_dot")
      if (dot) {
        dot.style.left = `${x}px`
        dot.style.top = `${y}px`
      }
    }, { x: currentX, y: currentY }).catch(() => {})

    await sleep(16)
  }
}

async function smoothClick(page, selectorOrBox) {
  let box = null
  if (typeof selectorOrBox === "string") {
    const el = await page.waitForSelector(selectorOrBox, { state: "visible", timeout: 3000 }).catch(() => null)
    if (el) {
      box = await el.boundingBox().catch(() => null)
    }
  } else if (selectorOrBox) {
    box = typeof selectorOrBox.boundingBox === "function" ? await selectorOrBox.boundingBox().catch(() => null) : selectorOrBox
  }

  if (box) {
    const targetX = box.x + box.width / 2
    const targetY = box.y + box.height / 2
    await smoothMouseMove(page, targetX, targetY)
    await sleep(150)

    await page.evaluate(({ x, y }) => {
      const ripple = document.createElement("div")
      ripple.className = "__demo_click_ripple"
      ripple.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(6, 182, 212, 0.45);
        border: 2px solid #06b6d4;
        transform: translate(-50%, -50%) scale(0.5);
        pointer-events: none;
        z-index: 9999999;
        transition: transform 0.4s ease-out, opacity 0.4s ease-out;
      `
      document.body.appendChild(ripple)
      requestAnimationFrame(() => {
        ripple.style.transform = "translate(-50%, -50%) scale(2.2)"
        ripple.style.opacity = "0"
      })
      setTimeout(() => ripple.remove(), 450)
    }, { x: targetX, y: targetY }).catch(() => {})

    await page.mouse.down().catch(() => {})
    await sleep(80)
    await page.mouse.up().catch(() => {})
    await sleep(250)
  }
}

async function injectCursorHelper(page) {
  await page.addStyleTag({
    content: `
      #__demo_cursor_dot {
        position: fixed;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #06b6d4;
        border: 2.5px solid #ffffff;
        box-shadow: 0 0 16px rgba(6, 182, 212, 0.9), 0 2px 8px rgba(0,0,0,0.5);
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 9999999;
        transition: width 0.15s, height 0.15s, background-color 0.15s;
      }
    `,
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

function getBrowserExecutable() {
  if (process.env.LOCALAPPDATA) {
    const p1 = path.join(process.env.LOCALAPPDATA, "ms-playwright", "chromium-1234", "chrome-win64", "chrome.exe")
    if (fs.existsSync(p1)) return p1
  }
  return undefined
}

async function prewarmRoutes() {
  console.log("⚡ Pre-warming all Next.js routes for instant switching...")
  const routes = [
    "/",
    "/vault",
    "/pulse",
    "/gateway/endpoint",
    "/gateway/providers",
    "/gateway/cli-tools",
    "/gateway/usage",
  ]
  await Promise.all(
    routes.map(async (r) => {
      try {
        await fetch(`${BASE_URL}${r}`)
      } catch {}
    })
  )
}

async function record() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log(`\n========================================`)
  console.log(`🎬 STARTING AUTOMATED KOSH DEMO RECORDING`)
  console.log(`========================================\n`)

  await prewarmRoutes()

  const executablePath = getBrowserExecutable()
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // Ultra-crisp 4K UI rendering
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1920, height: 1080 },
    },
  })

  const page = await context.newPage()
  page.setDefaultTimeout(60000)
  page.setDefaultNavigationTimeout(60000)

  try {
    // ----------------------------------------------------
    // SCENE 1: Home Dashboard & Local Sources (0:00 - 0:08)
    // ----------------------------------------------------
    console.log("▶ [Scene 1] Dashboard Overview & Usage Trends...")
    await page.goto(`${BASE_URL}/`, { waitUntil: "commit" })
    await sleep(1500)
    await injectCursorHelper(page)
    await sleep(2000)

    // Smooth hover over the Antigravity card
    await smoothMouseMove(page, 960, 420)
    await sleep(1000)

    // ----------------------------------------------------
    // SCENE 2: Antigravity Local AI Usage Drawer (0:08 - 0:16)
    // ----------------------------------------------------
    console.log("▶ [Scene 2] Opening Antigravity local usage breakdown...")
    const antigravityBtn = await page.$("text=Antigravity")
    if (antigravityBtn) {
      await smoothClick(page, antigravityBtn)
      await sleep(2000)

      // Scroll drawer down slightly to reveal daily trend & model breakdown
      await page.evaluate(() => {
        const drawer = document.querySelector(".custom-scrollbar, [role='dialog'], aside, div.overflow-y-auto")
        if (drawer) drawer.scrollTop += 240
      }).catch(() => {})
      await sleep(1500)

      await page.keyboard.press("Escape")
      await sleep(1000)
    }

    // ----------------------------------------------------
    // SCENE 3: Vault & Key Encryption (0:16 - 0:24)
    // ----------------------------------------------------
    console.log("▶ [Scene 3] Navigating to Encrypted Key Vault...")
    await page.goto(`${BASE_URL}/vault`, { waitUntil: "commit" })
    await sleep(1200)
    await injectCursorHelper(page)
    await sleep(2000)

    await smoothMouseMove(page, 500, 240)
    await sleep(1000)

    // ----------------------------------------------------
    // SCENE 4: Pulse & Spend Monitoring (0:24 - 0:32)
    // ----------------------------------------------------
    console.log("▶ [Scene 4] Navigating to Pulse Metrics...")
    await page.goto(`${BASE_URL}/pulse`, { waitUntil: "commit" })
    await sleep(1200)
    await injectCursorHelper(page)
    await sleep(2200)

    // ----------------------------------------------------
    // SCENE 5: Gateway - 5-Hub System & Endpoint (0:32 - 0:42)
    // ----------------------------------------------------
    console.log("▶ [Scene 5] Navigating to Gateway Hubs...")
    await page.goto(`${BASE_URL}/gateway/endpoint`, { waitUntil: "commit" })
    await sleep(1200)
    await injectCursorHelper(page)
    await sleep(2200)

    // Hover across the navigation hubs
    const hubs = await page.$$("nav a, div a:has(span.material-symbols-outlined)")
    for (let i = 0; i < Math.min(hubs.length, 5); i++) {
      const box = await hubs[i].boundingBox().catch(() => null)
      if (box) {
        await smoothMouseMove(page, box.x + box.width / 2, box.y + box.height / 2, 15)
        await sleep(350)
      }
    }

    // ----------------------------------------------------
    // SCENE 6: Gateway - Providers & Topology (0:42 - 0:52)
    // ----------------------------------------------------
    console.log("▶ [Scene 6] Providers & Multi-Model Routing...")
    await page.goto(`${BASE_URL}/gateway/providers`, { waitUntil: "commit" })
    await sleep(1200)
    await injectCursorHelper(page)
    await sleep(2200)

    // ----------------------------------------------------
    // SCENE 7: Gateway - CLI & Tool Integrations (0:52 - 1:00)
    // ----------------------------------------------------
    console.log("▶ [Scene 7] CLI Tools (Cursor, Claude Code, Cline, Codex)...")
    await page.goto(`${BASE_URL}/gateway/cli-tools`, { waitUntil: "commit" })
    await sleep(1200)
    await injectCursorHelper(page)
    await sleep(2200)

    // ----------------------------------------------------
    // SCENE 8: Gateway - Usage & Real-time Logs (1:00 - 1:08)
    // ----------------------------------------------------
    console.log("▶ [Scene 8] Real-time Usage & Token Logs...")
    await page.goto(`${BASE_URL}/gateway/usage`, { waitUntil: "commit" })
    await sleep(1200)
    await injectCursorHelper(page)
    await sleep(2500)

    console.log("\n✓ All scenes recorded successfully!")
  } finally {
    const video = page.video()
    const finalName = path.join(OUTPUT_DIR, "kosh_product_demo.webm")
    const mp4Name = path.join(OUTPUT_DIR, "kosh_product_demo.mp4")

    await page.close().catch(() => {})
    await context.close().catch(() => {})
    await browser.close().catch(() => {})

    if (video) {
      await video.saveAs(finalName).catch(async () => {
        const rawPath = await video.path().catch(() => null)
        if (rawPath && fs.existsSync(rawPath)) {
          fs.copyFileSync(rawPath, finalName)
        }
      })
      console.log(`\n🎉 Crisp 1080p 60FPS WebM Video Saved To:`)
      console.log(`   ${finalName}`)

      // Convert to MP4 using Playwright ffmpeg if available
      const ffmpegExe = path.join(
        process.env.LOCALAPPDATA || "",
        "ms-playwright",
        "ffmpeg-1011",
        "ffmpeg-win64.exe"
      )
      if (fs.existsSync(ffmpegExe)) {
        try {
          const { execSync } = await import("child_process")
          execSync(`"${ffmpegExe}" -y -i "${finalName}" -c:v libx264 -pix_fmt yuv420p "${mp4Name}"`, { stdio: "ignore" })
          console.log(`🎉 Universally Compatible MP4 Video Saved To:`)
          console.log(`   ${mp4Name}\n`)
        } catch {}
      }
    }
  }
}

record().catch(console.error)
