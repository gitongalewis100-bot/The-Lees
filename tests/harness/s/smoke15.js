module.exports = { run: async (page, shot, { signIn }) => {
  await page.evaluate(() => { localStorage.setItem('v12-guide-done-Lewis','1'); });
  await signIn(); await page.evaluate(() => { try { LeesV12.guide.stop(true); } catch(e){} });
  await shot('home');
  await page.click('#ar12Fab .ar12-unit'); await page.waitForTimeout(700); await shot('arten-open');
  await page.fill('.ar12-in', 'what do you know about my partner'); await page.press('.ar12-in', 'Enter');
  await page.waitForTimeout(300); await shot('thinking');
  await page.waitForTimeout(2500); await shot('answer');
  await page.fill('.ar12-in', 'how do I write in the journal'); await page.press('.ar12-in', 'Enter'); await page.waitForTimeout(3500); await shot('answer2');
  console.log(await page.evaluate(() => document.querySelector('.ar12-list').innerText.slice(0, 1500)));
}};
