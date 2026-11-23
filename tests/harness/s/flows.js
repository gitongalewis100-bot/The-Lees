module.exports = { run: async (page, shot, { signIn }) => {
  await page.waitForTimeout(800);
  await shot('lock');
  await page.click('#acctSwitch button[data-side="Agnes"]'); await page.waitForTimeout(500); await shot('lock-agnes');
  await page.click('#acctSwitch button[data-side="Lewis"]'); await page.waitForTimeout(400);
  await page.evaluate(() => { localStorage.setItem('v12-guide-done-Lewis', '1'); });
  await signIn();
  // partner comes online, then goes away
  await page.evaluate(() => __fake.presence(true)); await page.waitForTimeout(600); await shot('home-online');
  await page.evaluate(() => __fake.presence(false)); await page.waitForTimeout(4500);
  // do a few things
  await page.evaluate(() => LeesApp.openJournal()); await page.waitForTimeout(500);
  await page.evaluate(() => LeesApp.goBack()); await page.waitForTimeout(400);
  await page.evaluate(() => LeesApp.openChat()); await page.waitForTimeout(600);
  await page.fill('#input', 'Hello from the test 🌸'); await page.click('#send'); await page.waitForTimeout(1200);
  await shot('chat-header');
  await page.click('#presence'); await page.waitForTimeout(900); await shot('activity-them');
  await page.click('.act14-f:nth-child(2)'); await page.waitForTimeout(400); await shot('activity-me');
  // settings
  await page.evaluate(() => { document.querySelectorAll('.act14').forEach(n => n.remove()); LeesApp.goBack(); }); await page.waitForTimeout(300);
  await page.evaluate(() => LeesApp.openSettings()); await page.waitForTimeout(600); await shot('settings');
  await page.evaluate(() => LeesApp.openSettingsCategory('help')); await page.waitForTimeout(500); await shot('settings-help');
  await page.evaluate(() => LeesApp.openSettingsCategory('data')); await page.waitForTimeout(500); await shot('settings-data');
  // vault: delete a message for both then open
  await page.evaluate(async () => { const m = LeesApp.thread().find((x) => x.from === LeesApp.me); await LeesApp.sb.rpc('trash_delete_both', { p_id: m.id }); await LeesApp.reloadAll(); });
  await page.evaluate(() => LeesApp.openVault()); await page.waitForTimeout(1200); await shot('vault');
  // reset: wrong pass, then right pass
  await page.evaluate(() => LeesV12.openReset()); await page.waitForTimeout(600); await shot('reset');
  await page.fill('#rs12Pass', 'nope'); await page.click('.rs12-go'); await page.waitForTimeout(500);
  await page.click('.cb-box button:not(:has-text("Cancel"))');
  await page.waitForTimeout(900); await shot('reset-wrong');
  await page.fill('#rs12Pass', 'test'); await page.click('.rs12-go'); await page.waitForTimeout(500);
  await page.click('.cb-box button:not(:has-text("Cancel"))');
  await page.waitForTimeout(3000); await shot('after-reset');
  console.log('vault rows', await page.evaluate(() => 0));
  console.log('msgs after reset', await page.evaluate(() => __fake.DB.messages.length + ' thread=' + LeesApp.thread().length + ' guide=' + LeesV12.guide.on + ' view=' + LeesApp.view));
}};
