module.exports = { run: async (page, shot, { signIn }) => {
  await page.evaluate(() => { localStorage.setItem('v12-guide-done-Lewis','1'); });
  await signIn(); await page.evaluate(() => { try { LeesV12.guide.stop(true); } catch(e){} });
  const dump = async (label) => console.log('== ' + label + '\n' + await page.evaluate(() => {
    const vis = (n) => { const r = n.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight)) return false; const x = Math.min(innerWidth-1, Math.max(0, r.left + r.width/2)), y = Math.min(innerHeight-1, Math.max(0, r.top + Math.min(r.height/2, 10))); const t = document.elementFromPoint(x, y); return !!t && (t === n || n.contains(t) || t.contains(n)); };
    return [...document.querySelectorAll('button, [role=button], a, input, textarea')].filter(vis).map(n => n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : '') + (n.dataset.key ? '[key=' + n.dataset.key + ']' : '') + (n.closest('[data-sid]') ? '[sid=' + n.closest('[data-sid]').dataset.sid + ']' : '') + ' :: ' + (n.getAttribute('aria-label') || n.textContent || n.placeholder || '').trim().replace(/\s+/g,' ').slice(0, 50)).join('\n');
  }));
  await dump('home');
  await page.click('.navbtn[data-key="plus"]'); await page.waitForTimeout(600); await dump('create');
  await page.evaluate(() => LeesApp.goBack()); await page.waitForTimeout(400);
  await page.evaluate(() => LeesFeatures.openLetters()); await page.waitForTimeout(600); await dump('letters');
  await page.evaluate(() => LeesApp.goBack()); await page.waitForTimeout(400);
  await page.click('.settings-main'); await page.waitForTimeout(600); await dump('settings');
  await page.evaluate(() => LeesApp.openSettingsCategory('profile')); await page.waitForTimeout(600); await dump('profile');
  await page.evaluate(() => { while (LeesApp.view !== 'home') LeesApp.goBack(); }); await page.waitForTimeout(400);
  await page.click('.navbtn[data-key="book"]'); await page.waitForTimeout(600); await dump('journal');
  await page.evaluate(() => { LeesApp.goBack(); }); await page.waitForTimeout(400);
  await page.click('.navbtn[data-key="image"]'); await page.waitForTimeout(600); await dump('media');
  await page.evaluate(() => { LeesApp.goBack(); }); await page.waitForTimeout(400);
  await page.evaluate(() => LeesApp.openChat()); await page.waitForTimeout(700); await dump('chat');
  await page.click('#footer .lp-plus'); await page.waitForTimeout(500); await dump('plus');
}};
