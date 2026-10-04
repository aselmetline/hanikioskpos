import asyncio, json, os
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        page = await (await b.new_context(viewport={"width":1280,"height":1800})).new_page()
        await page.goto("http://localhost:8080")
        await page.evaluate(f"window.localStorage.setItem({json.dumps(os.environ['LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'])}, {json.dumps(os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON'])})")
        await page.goto("http://localhost:8080/"); await page.wait_for_timeout(3000)
        await page.click("button[aria-label='AI assistant']"); await page.wait_for_timeout(800)
        await page.set_input_files("div[role='dialog'] input[type=file]", "/tmp/browser/copilot/invoice.jpg")
        for _ in range(60):
            await page.wait_for_timeout(1000)
            t = await page.locator("div[role='dialog']").inner_text()
            if "تأكيد وإضافة" in t or "⚠️" in t: break
        await page.wait_for_timeout(500)
        print(t)
        await page.locator("div[role='dialog']").screenshot(path="scan.png")
        await b.close()
asyncio.run(main())
