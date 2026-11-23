/* 9.1 regression items not covered elsewhere (local, stand-in backend). */
const P = (ok, id, msg) => console.log((ok ? 'PASS' : 'FAIL') + ' ' + id + ' ' + msg);
module.exports = { run: async (page, shot, { signIn }) => {
  await page.evaluate(() => localStorage.setItem('v12-guide-done-Lewis', '1'));
  // sign-in and lock: a wrong passphrase is refused, the right one opens
  await page.click('#acctSwitch button[data-side="Lewis"]').catch(() => {}); await page.waitForTimeout(400);
  await page.fill('#pass', 'wrong-one'); await page.press('#pass', 'Enter'); await page.waitForTimeout(2500);
  const err = await page.evaluate(() => ({ home: !document.getElementById('home').classList.contains('hidden'), msg: document.getElementById('lockErr').textContent.trim() }));
  await shot('lock-wrong');
  P(!err.home, 'R-signin-wrong', 'wrong passphrase stays locked' + (err.msg ? ' ("' + err.msg + '")' : ''));
  await page.fill('#pass', 'test'); await page.press('#pass', 'Enter'); await page.waitForSelector('#home:not(.hidden)', { timeout: 15000 }); await page.waitForTimeout(2500);
  await page.evaluate(() => { try { LeesV12.guide.stop(true); } catch (e) {} });
  P(true, 'R-signin', 'right passphrase opens home');
  // journal create / edit / delete (through the app's own journal functions)
  const j = await page.evaluate(async () => { await LeesApp.saveJournal('Test page from the harness', 'entry'); await LeesApp.reloadJournal(); let e = LeesApp.journal.find(x => /Test page from the harness/.test(x.text || x.body || '')); const id = e && e.id; if (!id) return { id: null }; await LeesApp.editJournal(id, 'Edited page', 'entry'); await LeesApp.reloadJournal(); const edited = LeesApp.journal.some(x => x.id === id && /Edited page/.test(x.text || x.body || '')); await LeesApp.deleteJournal(id); await LeesApp.reloadJournal(); return { id, edited, gone: !LeesApp.journal.some(x => x.id === id) }; });
  P(j.id && j.edited && j.gone, 'R-journal', 'journal create / edit / delete ' + JSON.stringify(j));
  // chat: opens, sending jumps to the newest message, a sticker sends
  await page.evaluate(() => LeesApp.openChat()); await page.waitForTimeout(700);
  await page.evaluate(() => { const l = document.getElementById('list'); l.scrollTop = 0; });
  await page.fill('#input', 'Regression hello'); await page.click('#send'); await page.waitForTimeout(1200);
  const atEnd = await page.evaluate(() => { const l = document.getElementById('list'); return l.scrollHeight - l.scrollTop - l.clientHeight; });
  P(atEnd < 40 && await page.evaluate(() => __fake.DB.messages.some(m => m.text === 'Regression hello')), 'R-send', 'text sent and the list jumped to the newest (' + Math.round(atEnd) + 'px from the end)');
  await page.click('#footer .lp-plus'); await page.waitForTimeout(400);
  await page.evaluate(() => [...document.querySelectorAll('.v9-mi')].find(n => /Sticker/.test(n.textContent)).click()); await page.waitForTimeout(600);
  await page.click('.v9-stk .v9-stk-b >> nth=40'); await page.waitForTimeout(1200);
  const st = await page.evaluate(() => __fake.DB.messages.filter(m => /^\[\[sticker:/.test(m.text || '')).map(m => m.text));
  P(st.length === 1, 'R-sticker', 'the 41st sticker sends: ' + st[0]);
  await shot('chat-after-sticker');
  const rendered = await page.evaluate(() => { const rows = document.querySelectorAll('#list .row'); const last = rows[rows.length - 1]; return !!(last && last.querySelector('svg, canvas, img, .stk, [class*="stk"], [class*="sticker"]')); });
  P(rendered, 'R-sticker-render', 'the sent sticker renders in the thread');
  // the other side sends a new sticker: it renders on this side
  await page.evaluate(() => __fake.partnerSend({ text: '[[sticker:' + Object.keys(LeesApp.STICKERS)[45] + ']]' })); await page.waitForTimeout(1500);
  P(await page.evaluate(() => { const rows = document.querySelectorAll('#list .row'); const last = rows[rows.length - 1]; return !!(last && last.classList.contains('theirs') !== false && last.querySelector('svg, canvas, img, [class*="stk"], [class*="sticker"]')); }), 'R-sticker-recv', 'a sticker from the other side (#46) renders');
  await shot('sticker-received');
  // recently deleted and restore
  const rs = await page.evaluate(async () => { const m = __fake.DB.messages.find(x => x.text === 'Regression hello'); await LeesApp.sb.rpc('trash_delete_both', { p_id: m.id }); await LeesApp.reloadAll(); const gone = !LeesApp.thread().some(x => x.id === m.id); return { id: m.id, gone }; });
  await page.evaluate(() => LeesApp.goBack()); await page.waitForTimeout(300);
  await page.evaluate(() => LeesApp.openVault()); await page.waitForTimeout(1200); await shot('vault');
  const restoreBtn = await page.evaluate(() => [...document.querySelectorAll('#panelBody button')].map(b => b.textContent.trim()).filter(t => /Restore/i.test(t)));
  await page.evaluate(() => { const b = [...document.querySelectorAll('#panelBody button')].find(n => /^Restore$/i.test(n.textContent.trim())) || [...document.querySelectorAll('#panelBody button')].find(n => /Restore/i.test(n.textContent)); if (b) b.click(); });
  await page.waitForTimeout(800);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.cb-box button')].find(n => !/Cancel/.test(n.textContent)); if (b) b.click(); }); await page.waitForTimeout(1500);
  const back = await page.evaluate((id) => __fake.DB.messages.some(x => x.id === id), rs.id);
  P(rs.gone && back, 'R-restore', 'deleted for both, then restored from Recently deleted (buttons: ' + restoreBtn.join(', ') + ')');
  await page.evaluate(() => { while (LeesApp.view === 'panel') LeesApp.goBack(); }); await page.waitForTimeout(300);
  // tic-tac-toe: open and make one move
  await page.click('.navbtn[data-key="plus"]'); await page.waitForTimeout(500); await page.click('.v8-card.v8-ttt'); await page.waitForTimeout(900);
  await shot('ttt');
  const ttt = await page.evaluate(() => { const d = document.getElementById('gameDock'); return d ? { cells: d.querySelectorAll('button').length, challenge: [...d.querySelectorAll('button')].some(b => /Challenge/.test(b.textContent)) } : null; });
  console.log((ttt && ttt.challenge ? 'PARTIAL' : 'FAIL') + ' R-ttt board opens in the chat with Challenge ' + JSON.stringify(ttt) + '; a move needs the other player to accept: NOT RUN');
  await page.evaluate(() => LeesApp.goBack()); await page.waitForTimeout(400);
  await page.evaluate(() => { while (LeesApp.view === 'panel') LeesApp.goBack(); }); await page.waitForTimeout(300);
  // idle: 5 minutes without activity shows "Still there?" with a 30-second countdown and Cancel / Sign out
  await page.evaluate(() => LeesApp.setActivityAt(Date.now() - 5 * 60 * 1000 - 2000)); await page.waitForTimeout(5000);
  const idle = await page.evaluate(() => { const b = document.querySelector('.cb-box'); return b ? { text: b.innerText.replace(/\n+/g, ' | '), btns: [...b.querySelectorAll('button')].map(x => x.textContent.trim()) } : null; });
  await shot('idle-banner');
  P(idle && /Still there\?/.test(idle.text) && /signed out in (30|2\d) seconds/.test(idle.text) && idle.btns.length === 2 && idle.btns.includes('Cancel') && idle.btns.some(t => /^Sign out/.test(t)), 'R-idle', 'idle banner: ' + JSON.stringify(idle));
  await page.evaluate(() => { const b = [...document.querySelectorAll('.cb-box button')].find(n => /Cancel/.test(n.textContent)); if (b) b.click(); }); await page.waitForTimeout(1500);
  const ic = await page.evaluate(() => ({ home: !document.getElementById('home').classList.contains('hidden'), banner: !!document.querySelector('.cb-box'), unlocked: LeesApp.unlocked }));
  P(ic.unlocked && !ic.banner, 'R-idle-cancel', 'Cancel keeps you signed in ' + JSON.stringify(ic));
}};
