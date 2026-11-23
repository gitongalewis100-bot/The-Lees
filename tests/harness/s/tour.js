/* Screenshot tour of every main screen. THEME=warm|ink|sage, PERF=low forces data-perf="low". */
module.exports = { run: async (page, shot, { signIn }) => {
  const theme = process.env.THEME || 'warm';
  await page.evaluate((t) => { localStorage.setItem('v12-guide-done-Lewis', '1'); localStorage.setItem('lees-theme-v14', t); }, theme);
  if (process.env.PERF) { await page.evaluate((p) => localStorage.setItem('lees-perf', JSON.stringify(p)), process.env.PERF); await page.reload(); await page.waitForTimeout(500); }
  await signIn(); await page.evaluate((t) => { try { LeesV12.guide.stop(true); } catch (e) {} LeesApp.setAppTheme(t); }, theme);
  await page.waitForTimeout(600);
  console.log('perf', await page.evaluate(() => document.documentElement.dataset.perf || '(none)'));
  await shot(theme + '-home');
  const go = async (name, fn) => { await page.evaluate(fn); await page.waitForTimeout(800); await shot(theme + '-' + name); await page.evaluate(() => { document.querySelectorAll('.act14').forEach(n => n.remove()); while (LeesApp.view === 'panel') LeesApp.goBack(); }); await page.waitForTimeout(300); };
  await go('settings', () => LeesApp.openSettings());
  await go('settings-profile', () => LeesApp.openSettingsCategory('profile'));
  await go('journal', () => LeesApp.openJournal());
  await go('letters', () => LeesFeatures.openLetters());
  await go('notifications', () => LeesApp.openNotifications());
  await go('media', () => LeesApp.openMedia());
  await go('about', () => LeesV12.openAbout());
  await go('activity', () => LeesV12.openActivity('Agnes'));
  await page.click('.navbtn[data-key="plus"]'); await page.waitForTimeout(500); await shot(theme + '-create');
  await page.click('.v8-card.v8-letter'); await page.waitForTimeout(500); await page.click('.v8-write'); await page.waitForTimeout(700); await shot(theme + '-chooser');
  await page.evaluate(() => { while (LeesApp.view === 'panel') LeesApp.goBack(); }); await page.waitForTimeout(300);
  await page.evaluate(() => LeesApp.openChat()); await page.waitForTimeout(800); await shot(theme + '-chat');
  await page.evaluate(() => LeesApp.goBack()); await page.waitForTimeout(400);
  await page.click('#ar12Fab .ar12-unit'); await page.waitForTimeout(800);
  await page.fill('.ar12-in', 'how do I seal a letter'); await page.press('.ar12-in', 'Enter'); await page.waitForTimeout(3500); await shot(theme + '-arten');
}};
