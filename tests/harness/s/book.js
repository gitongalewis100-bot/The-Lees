/* v16: the backup book (PDF and Markdown) and the ARTEN "Ask" slide (local, stand-in backend). */
const P = (ok, id, msg) => console.log((ok ? 'PASS' : 'FAIL') + ' ' + id + ' ' + msg);
module.exports = { run: async (page, shot, { signIn, ctx }) => {
  await page.evaluate(() => localStorage.setItem('v12-guide-done-Lewis', '1'));
  await signIn(); await page.evaluate(() => { try { LeesV12.guide.stop(true); } catch (e) {} });
  await page.evaluate(() => LeesApp.openChat()); await page.waitForTimeout(700); await page.evaluate(() => LeesApp.goBack()); await page.waitForTimeout(300);
  await page.mouse.move(10, 10); await page.waitForTimeout(4600);
  const asking = await page.evaluate(() => document.getElementById('ar12Fab').classList.contains('asking'));
  await shot('ask-slide');
  P(asking, 'ASK', 'after 3 s without input the flower slides left and shows "Ask"');
  await page.waitForTimeout(2800);
  P(await page.evaluate(() => !document.getElementById('ar12Fab').classList.contains('asking')), 'ASK2', 'it slides back');
  const html = await page.evaluate(async () => { const b = LeesV12.book; const d = await b.gather(); return { html: await b.html(d, false), md: b.markdown(d) }; });
  const ok = ['Mr Lees', 'Mrs Lees', 'Conversation', 'Coffee later?', 'Settings', 'Activity (last 10 days)', 'ARTEN conversations', 'Journal'].every(t => html.html.includes(t));
  P(ok && /\d{1,2}:\d\d [ap]m/.test(html.html) && !/\b\d{2}:\d{2}\b(?! ?[ap]m)/.test(html.html.replace(/<style[\s\S]*?<\/style>/, '')), 'BOOK1', 'book has names, every section, messages, 12-hour times');
  P(/^# The Lees backup: Mr Lees & Mrs Lees/.test(html.md) && html.md.includes('Coffee later?'), 'BOOK2', 'Markdown backup has the same content');
  const p2 = await ctx.newPage(); await p2.setContent(html.html); await p2.pdf({ path: require('path').join(__dirname, '..', '..', 'screenshots', 'v16-backup-sample.pdf'), format: 'A4', printBackground: true });
  await p2.setViewportSize({ width: 794, height: 1123 }); await p2.screenshot({ path: require('path').join(__dirname, '..', '..', 'screenshots', 'v16-backup-cover.png') });
  await p2.evaluate(() => document.querySelector('.chat').scrollIntoView()); await p2.screenshot({ path: require('path').join(__dirname, '..', '..', 'screenshots', 'v16-backup-chat.png') });
  P(true, 'BOOK3', 'PDF rendered: tests/screenshots/v16-backup-sample.pdf');
  await page.evaluate(() => LeesApp.openSettingsCategory('data')); await page.waitForTimeout(600);
  P(await page.evaluate(() => !!document.querySelector('[data-sid="book"]') && !!document.querySelector('[data-sid="bookmd"]')), 'BOOK4', 'Settings › Messages & data lists Backup book (PDF) and (Markdown)');
}};
