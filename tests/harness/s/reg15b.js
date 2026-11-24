/* 9.1 regression, part 2 (local, stand-in backend): sealed letters open / delete for me / delete for both,
   tic-tac-toe one move, voice note (run with FAKEMIC=1 for Chromium's fake microphone). */
const P = (ok, id, msg) => console.log((ok ? 'PASS' : 'FAIL') + ' ' + id + ' ' + msg);
module.exports = { run: async (page, shot, { signIn }) => {
  await page.evaluate(() => { localStorage.setItem('v12-guide-done-Lewis', '1'); const D = __fake.DB, past = new Date(Date.now() - 3600e3).toISOString();
    D.sealed_letters.push({ id: 'L-recv', pair_id: __fake.PAIR, author_id: __fake.AGNES, author_side: 'Agnes', recipient_side: 'Lewis', title: 'Open when you miss me', body: 'RECEIVED-BODY', seal: 'wax-rose', paper: 'blush', open_at: past, opened_at: null, created_at: past },
      { id: 'L-sent1', pair_id: __fake.PAIR, author_id: __fake.LEWIS, author_side: 'Lewis', recipient_side: 'Agnes', title: 'Sent one', body: 'S1', seal: 'wax-red', paper: 'cream', open_at: new Date(Date.now() + 864e5).toISOString(), opened_at: null, created_at: past },
      { id: 'L-sent2', pair_id: __fake.PAIR, author_id: __fake.LEWIS, author_side: 'Lewis', recipient_side: 'Agnes', title: 'Sent two', body: 'S2', seal: 'wax-gold', paper: 'sky', open_at: new Date(Date.now() + 864e5).toISOString(), opened_at: null, created_at: past }); });
  await signIn(); await page.evaluate(() => { try { LeesV12.guide.stop(true); } catch (e) {} });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { document.querySelectorAll('.v8-overlay').forEach(n => n.remove()); while (LeesApp.view === 'panel') LeesApp.goBack(); });
  // open a received letter
  await page.evaluate(() => LeesFeatures.openLetters('in')); await page.waitForTimeout(900);
  await page.evaluate(() => { const c = [...document.querySelectorAll('.v8-env')].find(n => /Open when you miss me/.test(n.textContent)); if (c) c.click(); }); await page.waitForTimeout(2500);
  const opened = await page.evaluate(() => ({ body: document.body.innerText.includes('RECEIVED-BODY'), at: !!__fake.DB.sealed_letters.find(l => l.id === 'L-recv').opened_at }));
  await shot('letter-open');
  P(opened.body && opened.at, 'R-letter-open', 'a received letter opens and is marked opened ' + JSON.stringify(opened));
  await page.evaluate(() => { document.querySelectorAll('.v8-overlay').forEach(n => n.remove()); while (LeesApp.view === 'panel') LeesApp.goBack(); }); await page.waitForTimeout(400);
  // delete for me (a sent letter), then delete for both (the other sent letter)
  const del = async (title, choice) => {
    await page.evaluate(() => LeesFeatures.openLetters('out')); await page.waitForTimeout(800);
    await page.evaluate(() => [...document.querySelectorAll('#panel button')].find(n => n.textContent.trim() === 'Select').click()); await page.waitForTimeout(400);
    await page.evaluate((t) => [...document.querySelectorAll('.v8-env')].find(n => n.textContent.includes(t)).click(), title); await page.waitForTimeout(200);
    const dbtn = await page.evaluate(() => [...document.querySelectorAll('#panel button, body > div button')].filter(b => b.offsetParent).map(b => b.textContent.trim()).filter(t => /^Delete/.test(t)));
    await page.evaluate(() => { const all = [...document.querySelectorAll('button')].filter(b => b.offsetParent); const b = all.find(n => /^Delete selected/.test(n.textContent.trim())) || all.find(n => /^Delete/.test(n.textContent.trim())); b.click(); }); await page.waitForTimeout(500);
    const banner = await page.evaluate(() => [...document.querySelectorAll('.cb-box button')].map(b => b.textContent.trim()));
    await shot('letter-delete-' + choice);
    await page.evaluate((c) => [...document.querySelectorAll('.cb-box button')].find(n => n.textContent.trim() === c).click(), choice); await page.waitForTimeout(900);
    await page.evaluate(() => { while (LeesApp.view === 'panel') LeesApp.goBack(); }); await page.waitForTimeout(300);
    return { dbtn, banner };
  };
  const d1 = await del('Sent one', 'Delete for me');
  const l1 = await page.evaluate(() => __fake.DB.sealed_letters.find(l => l.id === 'L-sent1'));
  P(l1 && (l1.hidden_for || []).includes('Lewis'), 'R-letter-me', 'Delete for me hides it for you only, Agnes keeps it ' + JSON.stringify(d1));
  const d2 = await del('Sent two', 'Delete for both');
  P(!(await page.evaluate(() => __fake.DB.sealed_letters.some(l => l.id === 'L-sent2'))), 'R-letter-both', 'Delete for both removes it for both');
  // tic-tac-toe: challenge, the other side accepts, make one move
  await page.click('.navbtn[data-key="plus"]'); await page.waitForTimeout(500); await page.click('.v8-card.v8-ttt'); await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('#gameDock button')].find(n => /Challenge/.test(n.textContent)).click()); await page.waitForTimeout(900);
  await page.evaluate(() => { const g = __fake.DB.game_sessions.slice(-1)[0]; g.status = 'active'; g.state = { ...g.state, turn: 'Lewis' }; __fake.emit('game_sessions', 'UPDATE', g); }); await page.waitForTimeout(1200);
  await page.evaluate(() => { const c = document.querySelectorAll('#gameDock .ttt-cell')[4]; if (c) c.click(); }); await page.waitForTimeout(1200);
  const g = await page.evaluate(() => __fake.DB.game_sessions.slice(-1)[0].state);
  await shot('ttt-move');
  P(g.board[4] === 'Lewis' && g.turn === 'Agnes', 'R-ttt', 'one move played: centre is yours, turn passes to Agnes ' + JSON.stringify(g));
  await page.evaluate(() => LeesApp.goBack()); await page.waitForTimeout(400);
  // voice note
  if (process.env.FAKEMIC) {
    await page.evaluate(() => LeesApp.openChat()); await page.waitForTimeout(800);
    const before = await page.evaluate(() => __fake.DB.messages.filter(m => m.kind === 'audio').length);
    await page.click('#mic'); await page.waitForTimeout(2500); await shot('voice-recording');
    const ui = await page.evaluate(() => [...document.querySelectorAll('#footer button, .vc9 button, [class*="vc"] button')].filter(b => b.offsetParent).map(b => b.getAttribute('aria-label') || b.textContent.trim()).slice(0, 10));
    const sendLbl = await page.evaluate(() => { const vis = [...document.querySelectorAll('button')].filter(b => b.offsetParent && b.getBoundingClientRect().top > innerHeight - 120); const b = vis.filter(x => /send/i.test(x.getAttribute('aria-label') || x.title || '')).pop() || vis.pop(); b.click(); return b.getAttribute('aria-label') || b.className; });
    await page.waitForTimeout(3000);
    const after = await page.evaluate(() => __fake.DB.messages.filter(m => m.kind === 'audio').map(m => m.media_path));
    await shot('voice-sent');
    P(after.length === before + 1 && !!after[after.length - 1], 'R-voice', 'voice note recorded with the fake microphone and sent (' + after.length + ' audio messages; controls: ' + ui.join(', ') + ')');
  }
}};
