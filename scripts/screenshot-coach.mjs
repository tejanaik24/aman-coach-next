import { chromium } from "playwright";

const URL = "https://aman-coach-next.vercel.app";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${URL}/auth/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  await page.fill('input[type="email"]', "aman@akfitness.in");
  await page.fill('input[type="password"]', "AmanCoach@2024");
  await page.click('button[type="submit"]');

  await page.waitForURL("**/coach/admin", { timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "coach-admin-dashboard.png", fullPage: true });
  console.log("Screenshot saved: coach-admin-dashboard.png");

  await browser.close();
}

main().catch(console.error);
