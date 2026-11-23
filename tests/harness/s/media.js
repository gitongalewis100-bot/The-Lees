// Stage 8 photos, look at the preview, send, look at the album and the album viewer.
async function stage(page, n) {
  await page.evaluate(async (n) => {
    const dt = new DataTransfer();
    const hues = [12, 40, 90, 160, 200, 260, 300, 340, 20, 120, 180, 220];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('canvas'); c.width = 900; c.height = i % 3 ? 1200 : 700;
      const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, c.width, c.height);
      g.addColorStop(0, `hsl(${hues[i % 12]},70%,62%)`); g.addColorStop(1, `hsl(${(hues[i % 12] + 60) % 360},60%,35%)`);
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = 'rgba(255,255,255,.85)'; x.font = 'bold 160px sans-serif'; x.fillText(String(i + 1), 60, 220);
      const b = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
      dt.items.add(new File([b], `p${i + 1}.jpg`, { type: 'image/jpeg' }));
    }
    const f = document.getElementById('file'); f.files = dt.files; f.dispatchEvent(new Event('change', { bubbles: true }));
  }, n);
}
module.exports = { stage, run: async (page, shot, { signIn }) => {
  await signIn();
  await page.evaluate(() => { localStorage.setItem('v12-guide-done-Lewis', '1'); window.LeesV12 && LeesV12.guide.stop(true); });
  await page.evaluate(() => LeesApp.openChat()); await page.waitForTimeout(800);
  await stage(page, 8);
  await page.waitForTimeout(1200); await shot('preview');
  await page.click('#mediaPreview .mp-send'); await page.waitForTimeout(400); await shot('sending');
  await page.waitForTimeout(2500); await shot('album');
  console.log('rows', await page.evaluate(() => window.__fake.DB.messages.filter((m) => m.kind === 'image').map((m) => (m.batch_id || '').slice(0, 6)).join(',')));
  await page.click('.album9 .a9-tile'); await page.waitForTimeout(900); await shot('viewer');
}};
