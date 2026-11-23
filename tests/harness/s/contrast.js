/* 4.2: pixel-sampled contrast of every home tile's text against the tile as rendered (glass included). */
const { PNG } = (() => { try { return require('pngjs'); } catch (e) { return {}; } })();
module.exports = { run: async (page, shot, { signIn }) => {
  const sharp = null;
  await page.evaluate(() => localStorage.setItem('v12-guide-done-Lewis', '1'));
  if (process.env.PERF) { await page.evaluate((p) => localStorage.setItem('lees-perf', JSON.stringify(p)), process.env.PERF); await page.reload(); await page.waitForTimeout(400); }
  await signIn(); await page.evaluate(() => { try { LeesV12.guide.stop(true); } catch (e) {} });
  const L = (c) => { const v = c.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const out = [];
  for (const theme of ['warm', 'ink', 'sage']) {
    await page.evaluate((t) => LeesApp.setAppTheme(t), theme); await page.waitForTimeout(700);
    await shot('contrast-' + theme + (process.env.PERF ? '-' + process.env.PERF : ''));
    const tiles = await page.evaluate(() => [...document.querySelectorAll('.tools2 .navbtn, .hx9 .hx9-t')].map((n, i) => { n.dataset.ct = i; const r = n.getBoundingClientRect(); const texts = [n, ...n.querySelectorAll('*')].filter(e => [...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())); return { i, label: (n.getAttribute('aria-label') || n.textContent).trim().slice(0, 24), fgs: texts.map(e => getComputedStyle(e).color), x: r.left, y: r.top, w: r.width, h: r.height, bgCss: getComputedStyle(n).backgroundColor }; }));
    // hide the text, screenshot each tile, and take the median pixel as the rendered background
    await page.addStyleTag({ content: '.tools2 .navbtn *, .hx9 .hx9-t *{visibility:hidden!important}' }).then(h => (page.__hide = h));
    await page.waitForTimeout(150);
    for (const t of tiles) {
      const buf = await page.screenshot({ clip: { x: t.x + 4, y: t.y + 4, width: Math.max(4, t.w - 8), height: Math.max(4, t.h - 8) } });
      const png = PNG.sync.read(buf); const px = [];
      for (let k = 0; k < png.data.length; k += 16) px.push([png.data[k], png.data[k + 1], png.data[k + 2]]);
      px.sort((p, q) => L(p) - L(q)); const bg = px[Math.floor(px.length / 2)], lo = px[Math.floor(px.length * .1)], hi = px[Math.floor(px.length * .9)];
      let r = 99, fgW = '';
      for (const f of t.fgs) { const fg = f.match(/[\d.]+/g).slice(0, 3).map(Number); const x = Math.min(ratio(fg, lo), ratio(fg, hi), ratio(fg, bg)); if (x < r) { r = x; fgW = f; } }
      out.push({ theme, tile: t.label, ratio: +r.toFixed(2), fg: fgW, bg: 'rgb(' + bg.join(',') + ')', texts: t.fgs.length });
    }
    const sp = await page.evaluate(() => { const n = document.querySelector('.seen12'); const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    { const png = PNG.sync.read(await page.screenshot({ clip: { x: sp.x + 2, y: sp.y + 2, width: sp.w - 4, height: sp.h - 4 } })); const px = []; for (let k = 0; k < png.data.length; k += 16) px.push([png.data[k], png.data[k + 1], png.data[k + 2]]); px.sort((p, q) => L(p) - L(q)); const bg = px[Math.floor(px.length / 2)];
      const dark = theme === 'ink'; const cols = dark ? { green: [126, 232, 168], blue: [156, 194, 255], red: [255, 154, 143] } : { green: [17, 106, 58], blue: [10, 79, 196], red: [176, 0, 32] };
      Object.entries(cols).forEach(([k, c]) => out.push({ theme, tile: 'status ' + k, ratio: +ratio(c, bg).toFixed(2), fg: 'rgb(' + c.join(',') + ')', bg: 'rgb(' + bg.join(',') + ')' })); }
    await page.evaluate(() => document.querySelectorAll('style').forEach(s => { if (/visibility:hidden!important/.test(s.textContent)) s.remove(); }));
  }
  const worst = {}; out.forEach(o => { if (!worst[o.theme] || o.ratio < worst[o.theme].ratio) worst[o.theme] = o; });
  console.log('tiles sampled', out.length, 'below 4.5:', out.filter(o => o.ratio < 4.5).length);
  Object.values(worst).forEach(w => console.log('worst', w.theme, w.tile, w.ratio, w.fg, 'on', w.bg));
  console.log('tint per theme', JSON.stringify(['warm', 'ink', 'sage'].map(t => out.find(o => o.theme === t).bg)));
  require('fs').writeFileSync(require('path').join(__dirname, '..', '..', 'v15-contrast-' + (process.env.PERF || 'auto') + '.json'), JSON.stringify(out, null, 1));
}};
