const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'verify_01_initial.png', fullPage: false });
  console.log('01: initial load done');

  // Try to find the schedule tab
  const tabs = await page.$$('button');
  for (const t of tabs) {
    const txt = await t.innerText().catch(() => '');
    if (txt.includes('일정 배치') || txt.includes('일정')) {
      await t.click();
      await page.waitForTimeout(1500);
      break;
    }
  }
  await page.screenshot({ path: 'verify_02_schedule_tab.png' });
  console.log('02: schedule tab');

  // Look for "나란히 보기" button
  const allBtns = await page.$$('button');
  let naranhi = null;
  for (const b of allBtns) {
    const txt = await b.innerText().catch(() => '');
    if (txt.includes('나란히')) { naranhi = b; break; }
  }
  if (naranhi) {
    await naranhi.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'verify_03_dual_mode.png' });
    console.log('03: dual mode activated');
  } else {
    await page.screenshot({ path: 'verify_03_no_button.png' });
    console.log('03: naranhi button NOT found');
  }

  // Look for "단독 보기" button
  const allBtns2 = await page.$$('button');
  let solo = null;
  for (const b of allBtns2) {
    const txt = await b.innerText().catch(() => '');
    if (txt.includes('단독')) { solo = b; break; }
  }
  if (solo) {
    await solo.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'verify_04_back_to_solo.png' });
    console.log('04: back to solo mode');
  } else {
    console.log('04: 단독 button not found');
  }

  await browser.close();
  console.log('done');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
