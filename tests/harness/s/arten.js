module.exports = { run: async (page, shot, { signIn }) => {
  await page.evaluate(() => { localStorage.setItem('v12-guide-done-Lewis', '1'); });
  await signIn();
  await page.waitForTimeout(3600); await shot('fab-ask');
  await page.screenshot({ path: __dirname + '/../shots/arten/fab-zoom.png', clip: { x: 220, y: 760, width: 170, height: 84 } });
  await page.click('#ar12Fab .ar12-unit'); await page.waitForTimeout(150); await shot('opening');
  await page.waitForTimeout(600); await shot('open');
  await page.fill('.ar12-in', 'how can i see when she was last online and what she did'); await page.press('.ar12-in', 'Enter');
  await page.waitForTimeout(1200); await page.click('.ar12-msg.think .ar12-th'); await page.waitForTimeout(300); await shot('thinking');
  await page.waitForTimeout(3500); await shot('answer');
  await page.fill('.ar12-in', 'sned many pictres at once'); await page.press('.ar12-in', 'Enter');
  await page.waitForTimeout(4500); await shot('answer-typo');
  await page.fill('.ar12-in', 'banana spaceship'); await page.press('.ar12-in', 'Enter');
  await page.waitForTimeout(3500); await shot('nomatch');
  const qs = ['reset the app', 'restore deleted', 'letter that opens when she opens the app', 'change my password', 'dark mode', 'record audio', 'who are you', 'switch account to mrs lees', 'mute notifications', 'play tic tac toe', 'why are messages blurry'];
  console.log(await page.evaluate((qs) => qs.map((q) => q + ' => ' + LeesV12.ask(q).slice(0, 2).map((h) => h.e.id + ':' + h.s.toFixed(1)).join(', ')).join('\n'), qs));
  // Show me how -> guide
  await page.evaluate(() => { const b = [...document.querySelectorAll('.ar12-act.primary')]; b[0].click(); });
  await page.waitForTimeout(1600); await shot('showme');
  await page.evaluate(() => LeesV12.guide.stop(true)); await page.waitForTimeout(400);
  await page.click('#ar12Fab .ar12-unit'); await page.waitForTimeout(700);
  await page.click('.ar12-head .ar12-hb:nth-of-type(1)'); await page.waitForTimeout(300); await shot('goto-mode');
  await page.fill('.ar12-in', 'seal a letter'); await page.press('.ar12-in', 'Enter'); await page.waitForTimeout(1600); await shot('went');
}};
