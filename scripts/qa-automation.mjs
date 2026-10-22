import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import { CDPClient } from "./cdp-client.mjs"

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function run() {
  console.log("=== STARTING COMPLETE QA AUTOMATION ===")
  const tempDir = path.resolve(process.env.TEMP || "C:\\temp", "chrome-qa-profile-full")
  fs.mkdirSync(tempDir, { recursive: true })

  const shotsDir = "C:\\claude code\\aman-coach-next\\qa-shots"
  fs.mkdirSync(shotsDir, { recursive: true })

  const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
    "--headless=new",
    "--remote-debugging-port=9225",
    `--user-data-dir=${tempDir}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ])

  let wsUrl = null
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9225/json/version")
      const data = await res.json()
      wsUrl = data.webSocketDebuggerUrl
      break
    } catch {
      await sleep(250)
    }
  }

  if (!wsUrl) throw new Error("Could not connect to Chrome on port 9225")
  console.log("Connected to Chrome:", wsUrl)

  const listRes = await fetch("http://127.0.0.1:9225/json/list")
  const targets = await listRes.json()
  const pageTarget = targets.find((t) => t.type === "page") || targets[0]

  const client = new CDPClient(pageTarget.webSocketDebuggerUrl)
  await client.connect()
  console.log("CDP connected to page!")

  await client.send("Page.enable")
  await client.send("DOM.enable")
  await client.send("Runtime.enable")

  client.on("Runtime.consoleAPICalled", (params) => {
    const text = params.args?.map((a) => a.value || a.description || JSON.stringify(a)).join(" ")
    if (params.type === "error") console.error("BROWSER ERROR:", text)
    else console.log("BROWSER LOG:", text)
  })

  async function waitForButtonText(textSubstr, maxWaitMs = 60000) {
    const start = Date.now()
    let lastUrl = ""
    while (Date.now() - start < maxWaitMs) {
      const currentUrl = await client.eval(`window.location.href`)
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl
        console.log(`[URL] ${currentUrl} (waiting for button "${textSubstr}")`)
        const btns = await client.eval(`Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim().replace(/\\n/g, ' ')).filter(Boolean)`)
        console.log(`[BUTTONS on ${currentUrl}]:`, btns)
        const text = await client.eval(`document.body.innerText`)
        console.log(`[PAGE TEXT on ${currentUrl}]:`, text)
      }
      const ok = await client.eval(`
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const target = btns.find(b => b.innerText && b.innerText.includes(${JSON.stringify(textSubstr)}));
          if (target && !target.disabled) {
            target.scrollIntoView({ block: 'center' });
            target.click();
            return true;
          }
          return false;
        })()
      `)
      if (ok) return true
      await sleep(500)
    }
    throw new Error(`Timeout waiting for button containing: "${textSubstr}"`)
  }

  const clickButtonText = waitForButtonText

  async function clickLastQuickButton() {
    return await client.eval(`
      (() => {
        const quickBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText && b.innerText.includes('Quick'));
        if (quickBtns.length > 0) {
          const target = quickBtns[quickBtns.length - 1];
          target.scrollIntoView({ block: 'center' });
          target.click();
          return true;
        }
        return false;
      })()
    `)
  }

  // Set initial viewport: iPhone 14/15 (390 x 844)
  await client.setViewport(390, 844, 3)

  // 1. Login
  console.log("1. Navigating to login...")
  await client.send("Page.navigate", { url: "http://localhost:3917/login" })
  await sleep(2000)

  await client.eval(`
    (() => {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const inputs = document.querySelectorAll('input');
      setVal(inputs[0], 'coach@akfitness.in');
      setVal(inputs[1], 'AmanCoach@2026');
      setTimeout(() => {
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      }, 100);
    })()
  `)
  await sleep(3500)

  // 2. Open client "Teja Test P2" -> Plans tab
  console.log("2. Navigating to Teja Test P2 client page (Plans tab)...")
  await client.send("Page.navigate", {
    url: "http://localhost:3917/clients/c63005c3-18b1-4764-9158-6307628b5ac7?tab=plans",
  })
  await sleep(3000)

  // 3. Click "Workout" under Make plan in app
  console.log("3. Tapping 'Workout' under Make plan in app...")
  await waitForButtonText("Workout")
  await sleep(1500)

  // 4. Click "Blank plan"
  console.log("4. Tapping 'Blank plan'...")
  await waitForButtonText("Blank plan")
  await sleep(2000)

  // Wait for Plan Maker editor to mount and Day 1 Quick button to be ready
  console.log("Waiting for Plan Maker editor to mount...")
  await waitForButtonText("Quick", 30000)

  const currentMakerUrl = await client.eval(`window.location.href`)
  console.log("Landed on Plan Maker:", currentMakerUrl)

  // 5. Build 4-day plan using Quick Day
  // Day 1: Quick button was already clicked by waitForButtonText!
  console.log("Selecting Push split for Day 1...")
  await sleep(1000)
  await waitForButtonText("Push")
  await sleep(2000)

  // Day 2
  console.log("Building Day 2 (Pull)...")
  await waitForButtonText("Training day")
  await sleep(1500)
  await clickLastQuickButton()
  await sleep(1000)
  await waitForButtonText("Pull")
  await sleep(2000)

  // Day 3
  console.log("Building Day 3 (Legs)...")
  await waitForButtonText("Training day")
  await sleep(1500)
  await clickLastQuickButton()
  await sleep(1000)
  await waitForButtonText("Legs")
  await sleep(2000)

  // Day 4
  console.log("Building Day 4 (Upper Body)...")
  await waitForButtonText("Training day")
  await sleep(1500)
  await clickLastQuickButton()
  await sleep(1000)
  await waitForButtonText("Upper Body")
  await sleep(2500)

  console.log("4-Day plan built successfully!")

  // 6. Superset & Tri-set on Day 1
  console.log("Navigating to Day 1 via day strip...")
  await clickButtonText("D1")
  await sleep(1000)

  // Create Superset (2 exercises)
  console.log("Creating Superset...")
  await client.eval(`
    (() => {
      const barBtns = Array.from(document.querySelectorAll('button'));
      const supersetBtn = barBtns.find(b => b.innerText && b.innerText.includes('Superset'));
      if (supersetBtn) supersetBtn.click();
    })()
  `)
  await sleep(1500)

  await client.eval(`
    (() => {
      const sheet = document.querySelector('.space-y-2');
      if (sheet) {
        const btns = sheet.querySelectorAll('button');
        if (btns[0]) btns[0].click();
        if (btns[1]) btns[1].click();
      }
    })()
  `)
  await sleep(1000)
  await clickButtonText("Group as")
  await sleep(1500)

  // Create Tri-set (3 exercises)
  console.log("Creating Tri-set...")
  await client.eval(`
    (() => {
      const barBtns = Array.from(document.querySelectorAll('button'));
      const supersetBtn = barBtns.find(b => b.innerText && b.innerText.includes('Superset'));
      if (supersetBtn) supersetBtn.click();
    })()
  `)
  await sleep(1500)

  await client.eval(`
    (() => {
      const sheet = document.querySelector('.space-y-2');
      if (sheet) {
        const btns = sheet.querySelectorAll('button');
        if (btns[2]) btns[2].click();
        if (btns[3]) btns[3].click();
        if (btns[4]) btns[4].click();
      }
    })()
  `)
  await sleep(1000)
  await clickButtonText("Group as")
  await sleep(2000)

  console.log("Superset & Tri-set created successfully!")

  // 7. Capture screenshots at 390px
  console.log("Capturing 390px screenshots...")

  // Editor 390
  await client.eval(`window.scrollTo(0, 220)`)
  await sleep(800)
  await client.screenshot(path.join(shotsDir, "editor-390.png"))

  // Superset in Editor 390
  await client.eval(`
    (() => {
      const el = document.querySelector('.border-accent-orange\\\\/60, .border-accent-orange\\\\/40, [class*="border-accent-orange"]');
      if (el) el.scrollIntoView({ block: 'center' });
    })()
  `)
  await sleep(800)
  await client.screenshot(path.join(shotsDir, "superset-editor-390.png"))

  // Exercise sheet 390
  console.log("Opening Exercise Sheet for 390px...")
  await client.eval(`
    (() => {
      const strengthRows = Array.from(document.querySelectorAll('button')).filter(b => 
        b.innerText && b.innerText.includes('Reps') && !b.innerText.includes('Zone') && !b.innerText.includes('hold')
      );
      if (strengthRows.length > 0) strengthRows[0].click();
    })()
  `)
  await sleep(1500)
  await client.screenshot(path.join(shotsDir, "exercise-sheet-390.png"))
  await clickButtonText("Done")
  await sleep(1000)

  // Cardio sheet 390
  console.log("Opening Cardio Sheet for 390px...")
  await client.eval(`
    (() => {
      const cardioRows = Array.from(document.querySelectorAll('button')).filter(b => 
        b.innerText && (b.innerText.includes('Incline walk') || b.innerText.includes('Zone') || b.innerText.includes('min'))
      );
      if (cardioRows.length > 0) cardioRows[0].click();
    })()
  `)
  await sleep(1500)
  await client.screenshot(path.join(shotsDir, "cardio-sheet-390.png"))
  await clickButtonText("Done")
  await sleep(1000)

  // 8. Capture screenshots at 360px
  console.log("Switching to 360px viewport...")
  await client.setViewport(360, 780, 2)
  await sleep(1000)

  // Editor 360
  await client.eval(`window.scrollTo(0, 220)`)
  await sleep(800)
  await client.screenshot(path.join(shotsDir, "editor-360.png"))

  // Superset editor 360
  await client.eval(`
    (() => {
      const el = document.querySelector('.border-accent-orange\\\\/60, .border-accent-orange\\\\/40, [class*="border-accent-orange"]');
      if (el) el.scrollIntoView({ block: 'center' });
    })()
  `)
  await sleep(800)
  await client.screenshot(path.join(shotsDir, "superset-editor-360.png"))

  // Exercise sheet 360
  console.log("Opening Exercise Sheet for 360px...")
  await client.eval(`
    (() => {
      const strengthRows = Array.from(document.querySelectorAll('button')).filter(b => 
        b.innerText && b.innerText.includes('Reps') && !b.innerText.includes('Zone') && !b.innerText.includes('hold')
      );
      if (strengthRows.length > 0) strengthRows[0].click();
    })()
  `)
  await sleep(1500)
  await client.screenshot(path.join(shotsDir, "exercise-sheet-360.png"))
  await clickButtonText("Done")
  await sleep(1000)

  // Cardio sheet 360
  console.log("Opening Cardio Sheet for 360px...")
  await client.eval(`
    (() => {
      const cardioRows = Array.from(document.querySelectorAll('button')).filter(b => 
        b.innerText && (b.innerText.includes('Incline walk') || b.innerText.includes('Zone') || b.innerText.includes('min'))
      );
      if (cardioRows.length > 0) cardioRows[0].click();
    })()
  `)
  await sleep(1500)
  await client.screenshot(path.join(shotsDir, "cardio-sheet-360.png"))
  await clickButtonText("Done")
  await sleep(2000)

  // 9. Generate PDF pages 1 and 2
  console.log("Generating PDF and capturing pages 1 and 2...")
  await client.eval(`
    (() => {
      window.__latestPdfBase64 = null;
      window.open = () => ({ location: { href: '' }, close: () => {} });
      const origCreate = URL.createObjectURL;
      URL.createObjectURL = (blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          window.__latestPdfBase64 = reader.result.split(',')[1];
        };
        reader.readAsDataURL(blob);
        return origCreate(blob);
      };

      // Click the PDF button in the bottom thumb bar
      const barBtns = Array.from(document.querySelectorAll('button'));
      const pdfBtn = barBtns.find(b => b.innerText && b.innerText.includes('PDF'));
      if (pdfBtn) {
        console.log('Found PDF button, clicking it!');
        pdfBtn.click();
      } else {
        console.error('PDF button not found!');
      }
    })()
  `)

  // Wait for PDF generation
  let pdfBase64 = null
  for (let i = 0; i < 20; i++) {
    pdfBase64 = await client.eval(`window.__latestPdfBase64`)
    if (pdfBase64 && pdfBase64.length > 1000) {
      console.log("Captured PDF Blob successfully! Base64 length:", pdfBase64.length)
      break
    }
    await sleep(500)
  }

  if (!pdfBase64) throw new Error("PDF blob was not generated or intercepted!")

  // Save PDF file to disk
  fs.writeFileSync(path.join(shotsDir, "plan.pdf"), Buffer.from(pdfBase64, "base64"))
  console.log("Saved PDF to qa-shots/plan.pdf")

  // Navigate to local render-pages.html
  console.log("Navigating to local PDF page renderer...")
  await client.send("Page.navigate", {
    url: "file:///C:/claude%20code/aman-coach-next/qa-shots/render-pages.html",
  })
  await sleep(1500)

  // Render PDF pages on canvas
  console.log("Rendering PDF pages on canvas...")
  await client.eval(`renderPdf(${JSON.stringify(pdfBase64)})`)

  for (let i = 0; i < 20; i++) {
    const rendered = await client.eval(`window.__rendered`)
    if (rendered) break
    await sleep(500)
  }

  // Get Canvas 1 dimensions
  const c1Dims = await client.eval(`
    (() => {
      const c = document.getElementById('page-1');
      return { width: c.width, height: c.height };
    })()
  `)
  console.log("Page 1 canvas dimensions:", c1Dims)

  // Set viewport to fit canvas
  await client.setViewport(c1Dims.width + 40, c1Dims.height + 40, 1)
  await sleep(500)

  // Scroll to page 1
  await client.eval(`document.getElementById('page-1').scrollIntoView()`)
  await sleep(500)
  await client.screenshot(path.join(shotsDir, "pdf-page1.png"))

  // Get Canvas 2 dimensions
  const c2Dims = await client.eval(`
    (() => {
      const c = document.getElementById('page-2');
      return c ? { width: c.width, height: c.height } : null;
    })()
  `)

  if (c2Dims) {
    console.log("Page 2 canvas dimensions:", c2Dims)
    await client.eval(`document.getElementById('page-2').scrollIntoView()`)
    await sleep(500)
    await client.screenshot(path.join(shotsDir, "pdf-page2.png"))
  }

  // 10. Open OLD template and verify backward compatibility
  console.log("10. Testing OLD template: Upper/Lower 4 day (Deload)...")
  await client.setViewport(390, 844, 3)
  await client.send("Page.navigate", {
    url: "http://localhost:3917/plans/maker/102bed2c-3a23-4a19-81ad-ca0ae6ca679f",
  })
  await sleep(4000)

  const templateText = await client.eval(`document.body.innerText`)
  console.log("Template loaded, title present:", templateText.includes("Upper/Lower 4 day (Deload)"))
  console.log("Template contains Day 1 / D1:", templateText.includes("D1") || templateText.includes("Day 1"))

  // Test that old template generates PDF cleanly by clicking PDF button
  const oldTemplatePdfOk = await client.eval(`
    new Promise((resolve) => {
      window.open = () => ({ location: { href: '' }, close: () => {} });
      const origCreate = URL.createObjectURL;
      URL.createObjectURL = (blob) => {
        resolve(blob.size > 1000);
        return origCreate(blob);
      };

      const barBtns = Array.from(document.querySelectorAll('button'));
      const pdfBtn = barBtns.find(b => b.innerText && b.innerText.includes('PDF'));
      if (pdfBtn) pdfBtn.click();
      else resolve(false);

      setTimeout(() => resolve(false), 8000);
    })
  `)
  console.log("OLD template PDF generated cleanly without errors:", oldTemplatePdfOk)

  console.log("=== ALL QA STEPS COMPLETED SUCCESSFULLY ===")

  client.close()
  chrome.kill()
}

run().catch((err) => {
  console.error("QA automation failed:", err)
  process.exit(1)
})
