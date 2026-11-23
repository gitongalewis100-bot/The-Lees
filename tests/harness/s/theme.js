/* 4.22 (local, one context): theme preview + Keep writes user_prefs; sign out/in restores it from user_prefs. */
module.exports = { run: async (page, shot, { signIn }) => {
  await page.evaluate(() => localStorage.setItem('v12-guide-done-Lewis', '1'));
  await signIn(); await page.evaluate(() => { try { LeesV12.guide.stop(true); } catch (e) {} });
  await page.evaluate(() => LeesApp.openSettingsCategory('look')); await page.waitForTimeout(600);
  await page.click('[data-sid="theme"]'); await page.waitForTimeout(700);
  await shot('theme-picker');
  console.log('picker buttons:', await page.evaluate(() => [...document.querySelectorAll('#sheetBody button, #panelBody button')].map(b => b.textContent.trim()).filter(Boolean).slice(0, 30).join(' | ')));
  const clicked = await page.evaluate(() => { const b = [...document.querySelectorAll('#sheetBody button, #panelBody button')].find(n => /Ink Night/.test(n.textContent)); if (b) { b.click(); return true; } return false; });
  await page.waitForTimeout(600); await shot('theme-preview');
  console.log('clicked Ink Night:', clicked, 'data-theme now', await page.evaluate(() => document.documentElement.dataset.theme));
  const keep = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(n => /^Keep/.test(n.textContent.trim()) && n.offsetParent); if (b) { b.click(); return b.textContent.trim(); } return null; });
  await page.waitForTimeout(800);
  console.log('keep button:', keep, 'user_prefs:', JSON.stringify(await page.evaluate(() => (__fake.DB.user_prefs || []).map(r => ({ user: r.user_id.slice(0, 4), theme: r.theme })))));
  await page.evaluate(() => { while (LeesApp.view === 'panel') LeesApp.goBack(); });
  await page.click('.settings-out'); await page.waitForTimeout(300); await page.click('.cb-box button:has-text("Sign out")'); await page.waitForTimeout(1200);
  await page.evaluate(() => { localStorage.removeItem('lees-theme-v14'); localStorage.removeItem('pp-apptheme-Lewis'); });
  await page.fill('#pass', 'test'); await page.press('#pass', 'Enter'); await page.waitForSelector('#home:not(.hidden)'); await page.waitForTimeout(2500);
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  console.log((after === 'ink' ? 'PASS' : 'FAIL') + ' A22 (local, one context) theme restored from user_prefs after sign-in with the device cache cleared: ' + after);
  await shot('theme-after-signin');
}};
