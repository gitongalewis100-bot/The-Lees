module.exports = { run: async (page, shot, { signIn }) => {
  await page.evaluate(() => localStorage.setItem('v12-guide-done-Lewis', '1'));
  await signIn(); await page.evaluate(() => { try { LeesV12.guide.stop(true); } catch (e) {} });
  await page.evaluate(() => LeesV12.openReset()); await page.waitForTimeout(600);
  await page.click('#rs12Pass'); await page.waitForTimeout(200);
  const typing = await page.evaluate(() => document.getElementById('ar12Fab').classList.contains('gone'));
  await page.evaluate(() => document.activeElement.blur()); await page.waitForTimeout(200);
  const after = await page.evaluate(() => !document.getElementById('ar12Fab').classList.contains('gone'));
  console.log((typing && after ? 'PASS' : 'FAIL') + ' flower steps aside while typing in a page field (hidden ' + typing + ', back ' + after + ')');
}};
