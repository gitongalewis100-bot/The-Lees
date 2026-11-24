/* The chat composer and ARTEN's box against the owner's screenshot, plus hold to talk (run with FAKEMIC=1). */
const P = (ok, id, msg) => console.log((ok ? 'PASS' : 'FAIL') + ' ' + id + ' ' + msg);
module.exports = { run: async (page, shot, { signIn }) => {
  await page.evaluate(() => localStorage.setItem('v12-guide-done-Lewis', '1'));
  await signIn(); await page.evaluate(() => { try { LeesV12.guide.stop(true); } catch (e) {} });
  await page.evaluate(() => LeesApp.openChat()); await page.waitForTimeout(800);
  const c = await page.evaluate(() => { const f = document.getElementById('footer'); const vis = [...f.children].filter(n => n.offsetParent && n.getBoundingClientRect().width > 0); const cs = (n) => getComputedStyle(n); const send = document.getElementById('send'), mic = document.getElementById('mic'), plus = f.querySelector('.lp-plus');
    return { order: vis.map(n => n.id || n.className.split(' ')[0]), placeholder: document.getElementById('input').placeholder, sendBg: cs(send).backgroundColor, sendOpacity: cs(send).opacity, sendRound: cs(send).borderRadius, micBg: cs(mic).backgroundColor, plusBg: plus && cs(plus).backgroundColor, pill: cs(f).borderRadius, liveSpeech: !!f.querySelector('[aria-label*="speech" i], [aria-label*="dictat" i]') }; });
  console.log('  composer', JSON.stringify(c));
  P(c.order.join(',') === 'lp-plus,input,mic,send', 'C1', 'order: + , field, mic, send (' + c.order.join(', ') + ')');
  P(c.placeholder === 'Reply or hold to talk', 'C2', 'placeholder "' + c.placeholder + '"');
  P(c.sendBg === 'rgb(42, 36, 32)' && c.sendOpacity === '1' && c.sendRound === '50%', 'C3', 'send is a solid dark circle even when empty (' + c.sendBg + ')');
  P(c.micBg === c.plusBg && c.micBg !== c.sendBg && parseInt(c.pill) >= 30 && !c.liveSpeech, 'C4', 'grey round + and mic, one rounded pill, no live-speech control');
  await shot('composer');
  await page.screenshot({ path: __dirname + '/../shots/composer/composer-crop.png', clip: { x: 0, y: 760, width: 390, height: 84 } });
  // hold to talk: hold 1.6 s, release, a voice note is sent
  const count = () => page.evaluate(() => __fake.DB.messages.filter(m => m.kind === 'audio').length);
  const n0 = await count();
  const m = await page.evaluate(() => { const r = document.getElementById('mic').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(m.x, m.y); await page.mouse.down(); await page.waitForTimeout(1700);
  const recording = await page.evaluate(() => !document.getElementById('recbar').classList.contains('hidden'));
  await shot('holding');
  await page.mouse.up(); await page.waitForTimeout(3000);
  const n1 = await count();
  P(recording && n1 === n0 + 1, 'C5', 'hold to talk: recording while held, sent on release (' + n0 + '→' + n1 + ')');
  // slide away before releasing: discarded
  await page.mouse.move(m.x, m.y); await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.move(m.x - 150, m.y - 120, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(2500);
  const n2 = await count();
  const back = await page.evaluate(() => document.getElementById('recbar').classList.contains('hidden') && !document.getElementById('footer').classList.contains('hidden'));
  P(n2 === n1 && back, 'C6', 'slide away and release: discarded, composer back (' + n1 + '→' + n2 + ')');
  // a short tap still starts recording as before; Cancel discards
  await page.click('#mic'); await page.waitForTimeout(1500);
  const tapRec = await page.evaluate(() => !document.getElementById('recbar').classList.contains('hidden'));
  await page.click('#recCancel'); await page.waitForTimeout(1200);
  const n3 = await count();
  P(tapRec && n3 === n2, 'C7', 'a short tap still starts recording (tap behaviour unchanged); Cancel discards');
  // text still sends with the black button
  await page.fill('#input', 'Composer check'); await page.click('#send'); await page.waitForTimeout(1000);
  P(await page.evaluate(() => __fake.DB.messages.some(x => x.text === 'Composer check')), 'C8', 'text sends with the send button');
  await page.evaluate(() => LeesApp.goBack()); await page.waitForTimeout(400);
  // ARTEN box: the same pill with only send
  await page.click('#ar12Fab .ar12-unit'); await page.waitForTimeout(800);
  const a = await page.evaluate(() => { const f = document.querySelector('.ar12-form'); return { kids: [...f.children].filter(n => n.offsetParent).map(n => n.tagName.toLowerCase() + '.' + n.className.split(' ')[0]), radius: getComputedStyle(f).borderRadius, mic: !!f.querySelector('[aria-label*="mic" i], [aria-label*="record" i], [aria-label*="speech" i]') }; });
  P(a.kids.join(',') === 'textarea.ar12-in,button.ar12-send' && !a.mic, 'C9', 'ARTEN box: field and send only, no +, mic or live speech (' + a.kids.join(', ') + ')');
  await shot('arten-box');
  P(await page.evaluate(() => !!document.getElementById('ar15New') && document.getElementById('ar15New').textContent.trim() === 'New chat'), 'C10', 'ARTEN has a labelled New chat button');
}};
