// Receiving side: a batch of 6 photos from the partner makes one alert; unread counts it as one; read line.
module.exports = { run: async (page, shot, { signIn }) => {
  await page.evaluate(() => { localStorage.setItem('v12-guide-done-Lewis', '1'); });
  await signIn();
  await page.evaluate(() => {
    window.__notices = [];
    new MutationObserver(() => { const n = document.getElementById('notice'); const t = n.querySelector('.t'); if (t && !n.classList.contains('hidden')) { const s = t.textContent + ' | ' + ((n.querySelector('.d') || {}).textContent || ''); if (window.__notices[window.__notices.length - 1] !== s) window.__notices.push(s); } }).observe(document.getElementById('notice'), { childList: true, subtree: true, attributes: true });
    window.__chimes = 0; const oc = window.AudioContext; 
  });
  const before = await page.evaluate(() => LeesApp.unreadN);
  // partner sends 6 photos in one batch, staggered like real uploads
  await page.evaluate(async () => {
    const b = crypto.randomUUID();
    for (let i = 0; i < 6; i++) { __fake.partnerSend({ kind: 'image', media_path: 'x/p' + i, batch_id: b }); await new Promise((r) => setTimeout(r, 250)); }
  });
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => LeesApp.unreadN);
  console.log('unread before', before, 'after 6-photo batch', after);
  console.log('notices:', JSON.stringify(await page.evaluate(() => window.__notices)));
  await shot('home-after-batch');
  // three text messages to have something to scroll
  await page.evaluate(async () => { for (const t of ['One', 'Two', 'Three']) { __fake.partnerSend({ text: t }); await new Promise((r) => setTimeout(r, 300)); } });
  await page.waitForTimeout(2000);
  console.log('unread now', await page.evaluate(() => LeesApp.unreadN), 'notices:', JSON.stringify(await page.evaluate(() => window.__notices.slice(-3))));
  await page.evaluate(() => LeesApp.openChat()); await page.waitForTimeout(300); await shot('chat-open-blur');
  await page.waitForTimeout(1600); await shot('chat-after-read');
  console.log('unread after open', await page.evaluate(() => LeesApp.unreadN), 'glass rows', await page.evaluate(() => document.querySelectorAll('.unread-glass').length));
  await page.evaluate(() => { const l = document.getElementById('list'); l.scrollTop = l.scrollHeight; l.dispatchEvent(new Event('scroll')); });
  await page.waitForTimeout(1200);
  console.log('unread after bottom', await page.evaluate(() => LeesApp.unreadN));
}};
