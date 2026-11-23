// usage: node drive.js <scenario.js> ; scenario exports { seed, run: async (page, shot, helpers) => {} }
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const scen = require(path.resolve(process.argv[2]));
  const out = path.join(__dirname, 'shots', path.basename(process.argv[2], '.js'));
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const vp = process.env.DESK ? { width: 1280, height: 860 } : { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: !process.env.DESK, colorScheme: process.env.DARK ? 'dark' : 'light' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
  await page.addInitScript((s) => { window.__FAKE_SEED = s; }, scen.seed || {});
  await page.goto('http://localhost:5173/');
  let n = 0;
  const shot = async (name) => { await page.screenshot({ path: path.join(out, String(++n).padStart(2, '0') + '-' + name + '.png') }); };
  const signIn = async (side = 'Lewis') => {
    await page.click(`#acctSwitch button[data-side="${side}"]`).catch(() => {});
    await page.fill('#pass', 'test'); await page.press('#pass', 'Enter');
    await page.waitForSelector('#home:not(.hidden)', { timeout: 15000 });
    await page.waitForTimeout(scen.settle || 2500);
  };
  try { await scen.run(page, shot, { signIn, ctx }); } catch (e) { errs.push('SCENARIO ' + e.stack); await shot('fail'); }
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})();
