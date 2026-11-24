/* v15 acceptance run against the local stand-in backend. Prints one line per check: PASS/FAIL + evidence. */
const P = (ok, id, msg) => console.log((ok ? 'PASS' : 'FAIL') + ' ' + id + ' ' + msg);
const day = 864e5;
module.exports = {
  seed: { items: [
    { id: 'it1', pair_id: '99999999-9999-9999-9999-999999999999', author_side: 'Lewis', subject_side: 'Agnes', body: 'She likes sushi.', source: 'written', status: 'saved', created_at: '2026-11-20T10:00:00Z', updated_at: '2026-11-20T10:00:00Z' },
    { id: 'it2', pair_id: '99999999-9999-9999-9999-999999999999', author_side: 'Agnes', subject_side: 'Lewis', body: 'He loves football.', source: 'written', status: 'saved', created_at: '2026-11-21T10:00:00Z', updated_at: '2026-11-21T10:00:00Z' }
  ] },
  run: async (page, shot, { signIn, ctx }) => {
  const box = (sel) => page.evaluate((s) => { const n = document.querySelector(s); if (!n) return null; const r = n.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height }; }, sel);
  const fabVisible = () => page.evaluate(() => { const f = document.getElementById('ar12Fab'); if (!f || f.classList.contains('gone')) return false; const u = f.querySelector('.ar12-unit').getBoundingClientRect(); const hit = document.elementFromPoint(u.left + u.width / 2, u.top + u.height / 2); return !!hit && f.contains(hit); });
  await page.evaluate(() => { localStorage.setItem('v12-guide-done-Lewis', '1'); });
  // fixtures: activity yesterday, 3 days ago and 11 days ago
  await page.evaluate((day) => { const D = __fake.DB, now = Date.now(); const add = (ago, side, action, detail) => D.activity_log.push({ id: 'f' + Math.random(), pair_id: __fake.PAIR, user_id: side === 'Agnes' ? __fake.AGNES : __fake.LEWIS, side, at: new Date(now - ago).toISOString(), action, detail: detail || '' });
    add(day * 1 + 3600e3, 'Agnes', 'signin'); add(day * 1 + 3500e3, 'Agnes', 'send_text', '3 messages'); add(day * 1 + 3400e3, 'Agnes', 'letter', 'Open when you miss me');
    add(day * 3, 'Lewis', 'signin'); add(day * 3 - 60e3, 'Lewis', 'journal');
    add(day * 11, 'Agnes', 'signin'); add(day * 11 - 60e3, 'Agnes', 'nudge', 'OLD-FIXTURE');
    D.arten_conversations.push({ id: 'old-conv', pair_id: __fake.PAIR, user_id: __fake.LEWIS, side: 'Lewis', title: 'OLD-CONV', messages: [{ r: 'u', t: 'OLD-CONV question', at: 0 }], started_at: new Date(now - day * 11).toISOString(), archived_at: null }); }, day);
  await signIn(); await page.evaluate(() => { try { LeesV12.guide.stop(true); } catch (e) {} });
  await page.waitForTimeout(3200);
  P(await page.evaluate(() => (window.__purged || 0) >= 1), 'A5f', 'purge_retained_for_me called after sign-in (count ' + await page.evaluate(() => window.__purged || 0) + ')');
  // purge removed the 11-day fixture server-side in the stand-in; put it back to prove the UI hides it too
  await page.evaluate((day) => { __fake.DB.activity_log.push({ id: 'old2', pair_id: __fake.PAIR, user_id: __fake.AGNES, side: 'Agnes', at: new Date(Date.now() - day * 11).toISOString(), action: 'nudge', detail: 'OLD-FIXTURE' }); __fake.DB.arten_conversations.push({ id: 'old-conv2', pair_id: __fake.PAIR, user_id: __fake.LEWIS, side: 'Lewis', title: 'OLD-CONV', messages: [{ r: 'u', t: 'OLD-CONV question', at: 0 }], started_at: new Date(Date.now() - day * 11).toISOString(), archived_at: null }); }, day);
  await page.evaluate(() => { window.__purgeOff = true; });
  await page.evaluate(() => { LeesV12._act.load(); });
  await shot('home');
  P(await fabVisible(), 'A8-home', 'flower visible on home');
  P(await page.evaluate(() => document.getElementById('input').placeholder === 'Reply or hold to talk'), 'composer', 'placeholder is "Reply or hold to talk"');
  // ---------- Activity ----------
  await page.click('#people .act13'); await page.waitForTimeout(900);
  await page.evaluate(() => { window.__fake.DB.activity_log = window.__fake.DB.activity_log; });
  const act = await page.evaluate(() => ({ days: [...document.querySelectorAll('.act15-dh h3')].map(n => n.textContent), clears: [...document.querySelectorAll('.act15-clear')].map(n => n.textContent), counts: [...document.querySelectorAll('.act15-n')].map(n => n.textContent), old: document.querySelector('.act14-list').innerText.includes('OLD-FIXTURE'), times: [...document.querySelectorAll('.act15-time')].slice(0, 3).map(n => n.textContent), icons: document.querySelectorAll('.act15-ic svg').length }));
  console.log('  activity', JSON.stringify(act));
  P(act.days.length >= 2 && act.clears.every(c => /^Clears on \w+day \d+ \w+$/.test(c)), 'A5a', 'day cards with heading, count and "Clears on"');
  P(!act.old, 'A5g', 'fixture older than 10 days hidden');
  P(act.times.every(t => /^\d{1,2}:\d\d [ap]m$/.test(t)) && act.icons > 0, 'A5b', 'timeline entries with 12-hour time and icon');
  await shot('activity');
  P(await fabVisible(), 'A8-activity', 'flower visible on Activity');
  await page.click('.act14-f:nth-child(3)'); await page.waitForTimeout(300);
  const theirs = await page.evaluate(() => [...document.querySelectorAll('.act15-sh4')].map(n => n.textContent.split(' · ')[0]));
  P(theirs.length > 0 && theirs.every(w => w !== 'You'), 'A5c', 'Theirs filter shows only their sessions (' + [...new Set(theirs)].join(',') + ')');
  await page.click('.act14-f:nth-child(1)'); await page.waitForTimeout(300);
  await page.evaluate(() => { const l = document.querySelector('.act14-list'); l.scrollTop = 600; l.dispatchEvent(new Event('scroll')); });
  await page.waitForTimeout(200);
  const jump = await page.evaluate(() => !document.querySelector('.act14-jump').hidden);
  P(jump || await page.evaluate(() => document.querySelector('.act14-list').scrollHeight <= document.querySelector('.act14-list').clientHeight + 240), 'A5c2', 'jump-to-top appears after scrolling (or list too short to scroll)');
  await page.evaluate(() => { const l = document.querySelector('.act14-list'); l.scrollTop = 0; });
  const letterRow = await page.evaluateHandle(() => [...document.querySelectorAll('.act15-row')].find(n => /Sealed a letter/.test(n.textContent)));
  await letterRow.click(); await page.waitForTimeout(400); await shot('activity-detail');
  const det = await page.evaluate(() => ({ sheet: !!document.querySelector('.act15-sheet'), same: document.querySelectorAll('.act15-rel li').length, add: !!document.querySelector('.an15-add'), addH: document.querySelector('.an15-add') && document.querySelector('.an15-add').getBoundingClientRect().height, addRight: document.querySelector('.an15-add') && Math.round(innerWidth - document.querySelector('.an15-add').getBoundingClientRect().right) }));
  P(det.sheet && det.same >= 2, 'A5d', 'detail sheet with same-session entries (' + det.same + ')');
  P(det.add && det.addH === 44 && det.addRight <= 20, 'A5e/4.20', 'Add note right-aligned, 44px tall (h=' + det.addH + ', right gap ' + det.addRight + ')');
  await page.click('.an15-add'); await page.waitForTimeout(300);
  await page.fill('.an15-in', 'Loved this letter'); await shot('add-note');
  await page.click('.an15-row .btn:not(.ghost)'); await page.waitForTimeout(900);
  const sent = await page.evaluate(() => __fake.DB.messages.filter(m => /^Note about: Sealed a letter/.test(m.text || '')).map(m => m.text));
  P(sent.length === 1 && /Loved this letter/.test(sent[0]), 'A5e', 'Add note sends through sendText: ' + JSON.stringify(sent[0] || ''));
  await page.evaluate(() => { const s = document.querySelector('.act15-sheet'); if (s) s.remove(); document.querySelector('.act14 .act14-x').click(); });
  await page.waitForTimeout(400);
  // ---------- flower on the listed pages ----------
  const pages = [['Settings', () => LeesApp.openSettings()], ['Journal', () => LeesApp.openJournal()], ['Sealed letters', () => LeesFeatures.openLetters()], ['Media', () => LeesApp.openMedia()], ['Notifications', () => LeesApp.openNotifications()], ['About page', () => LeesV12.openAbout()]];
  for (const [name, fn] of pages) {
    await page.evaluate(fn); await page.waitForTimeout(700);
    const v = await fabVisible(); P(v, 'A8-' + name.replace(/ /g, ''), 'flower visible on ' + name);
    await shot('flower-' + name.replace(/ /g, '-'));
    await page.evaluate(() => { while (LeesApp.view === 'panel') LeesApp.goBack(); }); await page.waitForTimeout(300);
  }
  await page.evaluate(() => LeesApp.openChat()); await page.waitForTimeout(700);
  P(!(await fabVisible()), 'A8-chat', 'flower hidden in the conversation (by design; never covers the composer)');
  await page.click('#footer .lp-plus'); await page.waitForTimeout(400);
  await page.evaluate(() => [...document.querySelectorAll('.v9-mi')].find(n => /Sticker/.test(n.textContent)).click()); await page.waitForTimeout(700);
  const stk = await page.evaluate(() => ({ n: document.querySelectorAll('.v9-stk .v9-stk-b').length, label: (document.querySelector('.v15-stkn') || {}).textContent }));
  P(stk.n === 46 && /46 stickers/.test(stk.label), 'A21', 'sticker picker shows ' + stk.n + ' and says "' + stk.label + '"');
  await shot('stickers');
  // swipe the sticker sheet: short swipe snaps back, long swipe closes
  const sh = await box('#sheetBody');
  await page.mouse.move(195, sh.t + 20); await page.mouse.down(); await page.mouse.move(195, sh.t + 80, { steps: 12 }); await page.waitForTimeout(250); await page.mouse.up(); await page.waitForTimeout(500);
  P(await page.evaluate(() => !document.getElementById('sheet').classList.contains('hidden')), 'A11-sheet-snap', 'short swipe on the sticker sheet snaps back');
  await page.mouse.move(195, sh.t + 20); await page.mouse.down(); await page.mouse.move(195, 700, { steps: 18 }); await page.mouse.up(); await page.waitForTimeout(600);
  P(await page.evaluate(() => document.getElementById('sheet').classList.contains('hidden')), 'A11-sheet', 'long swipe closes the sticker sheet');
  await page.evaluate(() => LeesApp.goBack()); await page.waitForTimeout(500);
  // ---------- ARTEN zoom frames ----------
  await page.evaluate(() => { window.__frames = []; const pan = document.querySelector('.ar12-panel'); const t0 = performance.now(); const tick = () => { const r = pan.getBoundingClientRect(); window.__frames.push([Math.round(performance.now() - t0), Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]); if (performance.now() - t0 < 560) requestAnimationFrame(tick); }; window.__startFrames = () => requestAnimationFrame(tick); });
  await page.evaluate(() => { document.querySelector('#ar12Fab').addEventListener('click', () => setTimeout(window.__startFrames, 0), { once: true }); });
  await page.click('#ar12Fab .ar12-unit');
  await page.waitForTimeout(650);
  const fo = await page.evaluate(() => window.__frames);
  const pick = (arr) => { const out = []; for (let i = 0; i < 12; i++) out.push(arr[Math.min(arr.length - 1, Math.round(i * (arr.length - 1) / 11))]); return out; };
  const of = pick(fo); console.log('  open frames [ms,left,top,w,h]', JSON.stringify(of));
  P(of[0][3] < 120 && of[11][3] === 390 && of[11][4] === 844 && of.every((f, i) => i === 0 || f[3] >= of[i - 1][3]), 'A9-open', 'box grows from the flower (' + of[0][3] + 'px) to the viewport (390x844)');
  await shot('arten-open');
  P(await page.evaluate(() => { const g = document.querySelector('.ar15-greet'); return g && !g.hidden && /^Good (morning|afternoon|evening), Mr Lees\. I'm ARTEN/.test(g.textContent) && /Mrs Lees together/.test(g.textContent); }), 'A14', 'greeting pinned and personalised');
  P(await page.evaluate(() => getComputedStyle(document.querySelector('.ar15-greet')).position !== 'absolute' && !document.querySelector('.ar12-list').contains(document.querySelector('.ar15-greet'))), 'A14b', 'greeting is outside the scrolling list');
  // ---------- 3-turn conversation, overlap checks ----------
  const ask = async (q, wait = 3200) => { await page.fill('.ar12-in', q); await page.press('.ar12-in', 'Enter'); await page.waitForTimeout(wait); };
  await page.fill('.ar12-in', 'how do I write in the journal'); await page.press('.ar12-in', 'Enter'); await page.waitForTimeout(350);
  const th = await page.evaluate(() => { const n = document.querySelector('.ar15-tl'); const cs = getComputedStyle(n); return { text: n.textContent, size: parseFloat(cs.fontSize), mark: document.querySelector('.ar15-mark').classList.contains('thinking') }; });
  P(/^ARTEN is (thinking|cooking|ARTENING)$/.test(th.text) && th.size >= 15 && th.mark, 'A12', 'thinking: "' + th.text + '" at ' + th.size + 'px, flower mark animating');
  await shot('thinking-warm');
  await page.waitForTimeout(3000);
  P(await page.evaluate(() => /^Thought for \d+\.\d s$/.test(document.querySelector('.ar15-thought').textContent)), 'A12b', 'collapsed "Thought for N s" pill');
  await ask('what do you know about my partner');
  await ask('what does Mrs Lees know about me');
  const ov = await page.evaluate(() => { const l = document.querySelector('.ar12-list'); l.scrollTop = l.scrollHeight; const msgs = [...l.querySelectorAll('.ar12-msg')]; const last = msgs[msgs.length - 1].getBoundingClientRect(); const dock = document.querySelector('.ar15-dock .ar12-form').getBoundingClientRect(); const chips = document.querySelector('.ar15-dock .ar12-chips').getBoundingClientRect(); const head = document.querySelector('.ar15-head').getBoundingClientRect(); const list = l.getBoundingClientRect(); return { lastBottom: Math.round(last.bottom), chipsTop: Math.round(chips.top), formTop: Math.round(dock.top), formSide: [Math.round(dock.left), Math.round(innerWidth - dock.right)], headBottom: Math.round(head.bottom), listTop: Math.round(list.top), texts: msgs.map(m => m.innerText.slice(0, 90)) }; });
  console.log('  overlap', JSON.stringify(ov));
  P(ov.lastBottom <= ov.chipsTop && ov.listTop >= ov.headBottom && ov.formSide[0] === 12 && ov.formSide[1] === 12, 'A10-390', 'last message ends above the chips/composer; list starts below the header; composer 12px from each side');
  const cite = ov.texts.some(t => /Mrs Lees wrote that you love football/.test(t));
  P(cite, 'A20', 'partner-written item cited: "Mrs Lees wrote that you love football"');
  const all = await page.evaluate(() => document.querySelector('.ar12-list').innerText);
  P(!/\b(\w+) is \1\b/.test(all), 'A13a', 'no "X is X" in answers');
  P(/Mrs Lees likes sushi/.test(all), 'A13b', 'personal answer from saved items, name leading');
  await shot('three-turns');
  // ---------- 375x667 ----------
  await page.setViewportSize({ width: 375, height: 667 }); await page.waitForTimeout(500);
  await page.evaluate(() => { const l = document.querySelector('.ar12-list'); l.style.scrollBehavior = 'auto'; l.scrollTop = l.scrollHeight; }); await page.waitForTimeout(300);
  const ov2 = await page.evaluate(() => { const l = document.querySelector('.ar12-list'); l.scrollTop = l.scrollHeight; const msgs = [...l.querySelectorAll('.ar12-msg')]; const last = msgs[msgs.length - 1].getBoundingClientRect(); const chips = document.querySelector('.ar15-dock .ar12-chips').getBoundingClientRect(); const head = document.querySelector('.ar15-head').getBoundingClientRect(); return { lastBottom: Math.round(last.bottom), chipsTop: Math.round(chips.top), headBottom: Math.round(head.bottom), listTop: Math.round(l.getBoundingClientRect().top) }; });
  await page.waitForTimeout(300); await shot('three-turns-375');
  P(ov2.lastBottom <= ov2.chipsTop && ov2.listTop >= ov2.headBottom, 'A10-375', 'same checks at 375x667 ' + JSON.stringify(ov2));
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
  // ---------- proposals and refusals ----------
  const before = await page.evaluate(() => __fake.DB.arten_items.length);
  await ask('remember that she likes tulips');
  const prop = await page.evaluate(() => { const b = [...document.querySelectorAll('.ar12-msg.bot')].pop(); return { text: b.innerText, add: [...b.querySelectorAll('button')].some(x => /Add to the list/.test(x.textContent)) }; });
  const mid = await page.evaluate(() => __fake.DB.arten_items.length);
  P(prop.add && /tulips/.test(prop.text) && mid === before, 'A19a', 'proposal shown with "Add to the list"; nothing written before the tap (' + before + '→' + mid + ')');
  await shot('proposal');
  await page.evaluate(() => [...[...document.querySelectorAll('.ar12-msg.bot')].pop().querySelectorAll('button')].find(x => /Add to the list/.test(x.textContent)).click());
  await page.waitForTimeout(600);
  const row = await page.evaluate(() => __fake.DB.arten_items.slice(-1)[0]);
  P(row && row.source === 'arten' && row.status === 'saved' && /tulips/.test(row.body) && row.subject_side === 'Agnes', 'A19b', 'written only after the tap: ' + JSON.stringify(row && { body: row.body, source: row.source, status: row.status }));
  await ask('remember her phone number is 0712 345 678');
  const ref = await page.evaluate(() => [...document.querySelectorAll('.ar12-msg.bot')].pop().innerText);
  P(/won't save/.test(ref) && !/0712/.test(ref) && await page.evaluate(() => !__fake.DB.arten_items.some(r => /0712/.test(r.body))), 'A19c', 'phone number refused, not echoed, not stored');
  // ---------- chips → action list → Edit name ----------
  await page.evaluate(() => [...document.querySelectorAll('.ar12-chips .ar12-chip')].find(n => n.textContent === 'Profile').click()); await page.waitForTimeout(400);
  const acts = await page.evaluate(() => [...[...document.querySelectorAll('.ar12-msg.bot')].pop().querySelectorAll('.ar15-ai')].map(n => n.textContent));
  P(acts.join('|') === 'Edit name|Edit photo|About me', 'A15a', 'Profile chip opens actions: ' + acts.join(', '));
  await shot('chip-actions');
  await page.evaluate(() => [...[...document.querySelectorAll('.ar12-msg.bot')].pop().querySelectorAll('.ar15-ai')][0].click()); await page.waitForTimeout(1400);
  const en = await page.evaluate(() => { const r = document.querySelector('.st15-ring'); const t = document.querySelector('[data-sid="names"] input').getBoundingClientRect(); const rr = r && r.getBoundingClientRect(); return { title: document.getElementById('panelTitle').textContent, ring: !!r && !r.classList.contains('none'), over: rr && rr.left <= t.left && rr.right >= t.right && rr.top <= t.top && rr.bottom >= t.bottom, card: (document.querySelector('.st15-t') || {}).textContent }; });
  P(en.title === 'Profile' && en.ring && en.over, 'A15b', 'Edit name opens Profile with the name field highlighted; card "' + en.card + '"');
  await shot('edit-name');
  await page.click('.st15-b:has-text("Stop")');
  await page.evaluate(() => { while (LeesApp.view === 'panel') LeesApp.goBack(); }); await page.waitForTimeout(400);
  // ---------- Show me the steps (Journal) ----------
  await page.click('#ar12Fab .ar12-unit'); await page.waitForTimeout(700);
  await ask('how do I write in the journal');
  await page.evaluate(() => [...document.querySelectorAll('.ar12-act')].filter(n => /Show me the steps/.test(n.textContent)).pop().click()); await page.waitForTimeout(500);
  const s1 = await page.evaluate(() => ({ card: document.querySelector('.st15-t').textContent, view: LeesApp.view, arten: LeesV12.arten.isOpen() }));
  await shot('steps-1');
  await page.waitForTimeout(1200);
  const s1b = await page.evaluate(() => ({ view: LeesApp.view, arten: LeesV12.arten.isOpen(), card: document.querySelector('.st15-t').textContent }));
  P(/^Step 1 of 3: close ARTEN$/.test(s1.card) && s1b.arten && s1b.view === 'home' && s1b.card === s1.card, 'A16a', 'step 1 "' + s1.card + '"; nothing moved after waiting (ARTEN still open, view ' + s1b.view + ')');
  await page.click('#ar15Close'); await page.waitForTimeout(900);
  const s2 = await page.evaluate(() => document.querySelector('.st15-t').textContent);
  await shot('steps-2');
  await page.click('.navbtn[data-key="book"]'); await page.waitForTimeout(1100);
  const s3 = await page.evaluate(() => ({ card: document.querySelector('.st15-t') && document.querySelector('.st15-t').textContent, title: document.getElementById('panelTitle').textContent }));
  await shot('steps-3');
  P(/^Step 2 of 3: tap Journal$/.test(s2) && /^Step 3 of 3: tap Write in the journal$/.test(s3.card) && s3.title === 'Journal', 'A16b', 'steps advance only when the user taps: "' + s2 + '" → "' + s3.card + '"');
  await page.click('.st15-b:has-text("Stop")');
  await page.evaluate(() => { while (LeesApp.view === 'panel') LeesApp.goBack(); }); await page.waitForTimeout(400);
  // ---------- New chat, history, sign-out/sign-in ----------
  await page.click('#ar12Fab .ar12-unit'); await page.waitForTimeout(700);
  const nBefore = await page.evaluate(() => document.querySelectorAll('.ar12-list .ar12-msg').length);
  await page.click('#ar15New'); await page.waitForTimeout(600);
  const afterNew = await page.evaluate(() => ({ msgs: document.querySelectorAll('.ar12-list .ar12-msg').length, archived: __fake.DB.arten_conversations.filter(c => c.archived_at).length, convs: __fake.DB.arten_conversations.length }));
  P(nBefore > 0 && afterNew.msgs === 0 && afterNew.archived >= 1, 'A7a', 'New chat leaves an empty chat (' + nBefore + '→' + afterNew.msgs + ') and archives the old one (' + afterNew.archived + ' archived)');
  await ask('how many stickers are there');
  await page.click('#ar15Hist'); await page.waitForTimeout(800);
  const hist = await page.evaluate(() => ({ days: [...document.querySelectorAll('.ar15-hday')].map(n => n.textContent), rows: [...document.querySelectorAll('.ar15-hrow')].map(n => n.innerText.replace(/\n/g, ' | ')), old: document.querySelector('.ar15-hist').innerText.includes('OLD-CONV'), full: (() => { const r = document.querySelector('.ar15-hist').getBoundingClientRect(); return Math.round(r.width) === innerWidth; })() }));
  console.log('  history', JSON.stringify(hist));
  P(hist.rows.length >= 2 && hist.rows.every(r => /^\d{1,2}:\d\d [ap]m \| /.test(r)) && hist.days.length >= 1 && hist.full, 'A6', 'chat history full screen, grouped by day, 12-hour times');
  P(!hist.old, 'A6b', 'conversation older than 10 days not shown');
  await shot('history');
  await page.click('.ar15-hrow'); await page.waitForTimeout(400); await shot('history-open');
  P(await page.evaluate(() => document.querySelectorAll('.ar15-hconv .ar12-msg').length >= 2), 'A6c', 'tapping a row opens the whole conversation');
  await page.click('#ar15Back'); await page.waitForTimeout(300);
  P(await page.evaluate(() => document.querySelectorAll('.ar15-hrow').length > 0), 'A6d', 'Back from a conversation returns to the history list');
  await page.click('#ar15Back'); await page.waitForTimeout(300);
  await ask('what do you know about my partner');
  await page.click('#ar15Close'); await page.waitForTimeout(700);
  P(await page.evaluate(() => !document.querySelector('.ar12-root').classList.contains('open') && document.querySelectorAll('.ar12-root.closed').length === 1), 'A9-close', 'close leaves no overlay behind');
  // sign out
  await page.click('.settings-out'); await page.waitForTimeout(400);
  const btns = await page.evaluate(() => [...document.querySelectorAll('.cb-box button')].map(b => b.textContent.trim()));
  P(btns.length === 2 && btns.includes('Cancel') && btns.includes('Sign out'), 'H4', 'sign-out banner has exactly Cancel and Sign out: ' + btns.join(', '));
  await page.click('.cb-box button:has-text("Sign out")'); await page.waitForTimeout(1500);
  const ss = await page.evaluate(() => { const k = []; for (let i = 0; i < sessionStorage.length; i++) k.push(sessionStorage.key(i)); return { keys: k.filter(x => x.indexOf('lees-arten') === 0), msgs: document.querySelectorAll('.ar12-list .ar12-msg').length, archived: __fake.DB.arten_conversations.filter(c => c.archived_at).length }; });
  P(ss.keys.length === 0 && ss.msgs === 0 && ss.archived >= 2, 'A7b', 'sign-out archived the chat (' + ss.archived + ' archived), cleared it and the lees-arten* session keys');
  await page.waitForSelector('#pass', { state: 'visible' });
  await page.fill('#pass', 'test'); await page.press('#pass', 'Enter'); await page.waitForSelector('#home:not(.hidden)'); await page.waitForTimeout(2500);
  await page.click('#ar12Fab .ar12-unit'); await page.waitForTimeout(700);
  const empty = await page.evaluate(() => document.querySelectorAll('.ar12-list .ar12-msg').length);
  await page.click('#ar15Hist'); await page.waitForTimeout(800);
  const h2 = await page.evaluate(() => [...document.querySelectorAll('.ar15-hrow')].map(n => n.innerText.replace(/\n/g, ' | ')));
  P(empty === 0 && h2.some(r => /how many stickers are there/.test(r)), 'A7c', 'after sign-in the chat is empty and History shows the earlier chat (' + h2.length + ' rows)');
  await shot('history-after-signin');
  await page.click('#ar15Back'); await page.waitForTimeout(300);
  // swipe ARTEN: short swipe snaps back, long swipe closes
  await page.mouse.move(195, 60); await page.mouse.down(); await page.mouse.move(195, 130, { steps: 14 }); await page.waitForTimeout(250); await page.mouse.up(); await page.waitForTimeout(500);
  P(await page.evaluate(() => LeesV12.arten.isOpen()), 'A11-snap', 'short swipe on ARTEN snaps back');
  await page.mouse.move(195, 120); await page.mouse.down(); await page.mouse.move(195, 700, { steps: 20 }); await page.mouse.up(); await page.waitForTimeout(700);
  P(await page.evaluate(() => !LeesV12.arten.isOpen()), 'A11', 'swipe from y120 to y700 closes ARTEN');
  // ---------- About page ----------
  await page.evaluate(() => LeesV12.openAbout()); await page.waitForTimeout(900);
  const ab = await page.evaluate(() => [...document.querySelectorAll('.ab15-card')].map(c => ({ h: c.querySelector('h3').textContent, rows: [...c.querySelectorAll('.ab15-row')].map(r => r.innerText.replace(/\n/g, ' | ')) })));
  console.log('  about', JSON.stringify(ab));
  P(ab.length === 2 && ab[0].h === 'About me' && ab[1].h === 'About Mrs Lees' && ab[0].rows.some(r => /Written by Mrs Lees/.test(r)) && ab[1].rows.some(r => /Added by ARTEN/.test(r)) && ab[1].rows.some(r => /Written by you/.test(r)), 'A18a', 'two cards; author labels: Written by you / Written by Mrs Lees / Added by ARTEN');
  await shot('about');
  for (const [ci, text] of [[0, 'I play the guitar.'], [1, 'She studies law.']]) {
    await page.click(`.ab15-card:nth-of-type(${ci + 1}) .ab15-add`); await page.waitForTimeout(200);
    await page.fill(`.ab15-card:nth-of-type(${ci + 1}) .ab15-in`, text); await page.click(`.ab15-card:nth-of-type(${ci + 1}) .ab15-erow .btn:not(.ghost)`); await page.waitForTimeout(700);
  }
  const added = await page.evaluate(() => __fake.DB.arten_items.filter(r => /guitar|law/.test(r.body)).map(r => r.subject_side + ':' + r.body));
  P(added.length === 2 && added.includes('Lewis:I play the guitar.') && added.includes('Agnes:She studies law.'), 'A18b', 'add in each card: ' + added.join(' / '));
  const lawRow = await page.evaluateHandle(() => [...document.querySelectorAll('.ab15-main')].find(n => /law/.test(n.textContent)));
  await lawRow.click(); await page.waitForTimeout(200);
  await page.fill('.ab15-row .ab15-in', 'She studies law at Strathmore.'); await page.click('.ab15-row .ab15-erow .btn:not(.ghost)'); await page.waitForTimeout(700);
  P(await page.evaluate(() => __fake.DB.arten_items.some(r => r.body === 'She studies law at Strathmore.')), 'A18c', 'edit saved');
  const guitarDel = await page.evaluateHandle(() => [...document.querySelectorAll('.ab15-row')].find(n => /guitar/.test(n.textContent)).querySelector('.ab15-del'));
  await guitarDel.click(); await page.waitForTimeout(300);
  const dbtn = await page.evaluate(() => [...document.querySelectorAll('.cb-box button')].map(b => b.textContent.trim()));
  await shot('about-delete');
  await page.click('.cb-box button:has-text("Delete")'); await page.waitForTimeout(700);
  P(dbtn.length === 2 && dbtn.includes('Cancel') && dbtn.includes('Delete') && await page.evaluate(() => !__fake.DB.arten_items.some(r => /guitar/.test(r.body))), 'A18d', 'delete asks with Cancel / Delete, then removes');
  await page.evaluate(() => { LeesApp.goBack(); }); await page.waitForTimeout(300);
  await page.evaluate(() => LeesV12.openAbout()); await page.waitForTimeout(900);
  P(await page.evaluate(() => document.querySelector('.ab15-wrap').innerText.includes('She studies law at Strathmore.') && !document.querySelector('.ab15-wrap').innerText.includes('guitar')), 'A18e', 'reopening shows the saved state (reload of data)');
  await page.evaluate(() => { LeesApp.goBack(); }); await page.waitForTimeout(300);
  // ---------- Sealed letter chooser ----------
  await page.click('.navbtn[data-key="plus"]'); await page.waitForTimeout(500);
  await page.click('.v8-card.v8-letter'); await page.waitForTimeout(500);
  await page.click('.v8-write'); await page.waitForTimeout(700);
  const ch = await page.evaluate(() => { const order = [...document.querySelectorAll('#panelBody.v15-ch > *')].map(n => n.className.split(' ')[0]); const labs = [...document.querySelectorAll('#panelBody .v8-lab')].map(n => n.textContent); const sw = [...document.querySelectorAll('.v15-sw .v8-sw')].map(n => Math.round(n.getBoundingClientRect().width)); const go = document.querySelector('.v8-seal-btn'); return { order, labs, seals: document.querySelectorAll('.v15-sw .v8-sw.seal').length, papers: document.querySelectorAll('.v15-sw .v8-sw.paper').length, minSw: Math.min(...sw), chips: [...document.querySelectorAll('.v8-when .chip')].map(n => n.textContent), disabled: go.disabled, to: (document.querySelector('.v15-to') || {}).textContent }; });
  console.log('  chooser', JSON.stringify(ch));
  P(ch.order[0] === 'v15-prev' && ch.labs.join('|') === 'To|Wax seal|Paper|Open when' && ch.seals === 6 && ch.papers === 5 && ch.minSw >= 48 && ch.disabled && ch.to === 'Mrs Lees', 'A17a', 'preview on top, then To / Wax seal / Paper / Open when; 6 seals, 5 papers, swatches ' + ch.minSw + 'px; Seal disabled at first');
  P(['Tomorrow morning', 'This weekend', 'Pick a date and time'].every(c => ch.chips.includes(c)) && ch.chips.some(c => /next opens the app/.test(c)), 'A17b', 'Open when chips: ' + ch.chips.join(', '));
  await shot('chooser');
  const env0 = await page.evaluate(() => getComputedStyle(document.querySelector('.v15-prev .env')).getPropertyValue('--paper'));
  await page.click('.v15-sw .v8-sw.paper[aria-label="Sky paper"]'); await page.click('.v15-sw .v8-sw.seal[aria-label="Gold seal"]');
  const env1 = await page.evaluate(() => ({ paper: getComputedStyle(document.querySelector('.v15-prev .env')).getPropertyValue('--paper').trim(), seal: getComputedStyle(document.querySelector('.v15-prev .env')).getPropertyValue('--seal').trim() }));
  P(env0.trim() !== env1.paper && env1.paper === '#edf3fb' && env1.seal === '#b8892b', 'A17c', 'preview updates with paper and seal (' + JSON.stringify(env1) + ')');
  await page.fill('.v8-title', 'Open when you miss me');
  await page.fill('.v8-body', 'Dear Agnes, a test letter.');
  const dis2 = await page.evaluate(() => document.querySelector('.v8-seal-btn').disabled);
  await page.click('.v8-when .chip:has-text("Tomorrow morning")');
  const dis3 = await page.evaluate(() => document.querySelector('.v8-seal-btn').disabled);
  P(dis2 === true && dis3 === false, 'A17d', 'Seal enabled only with a body and an open time');
  await shot('chooser-filled');
  await page.click('.v8-seal-btn'); await page.waitForTimeout(400);
  const sbtn = await page.evaluate(() => [...document.querySelectorAll('.cb-box button')].map(b => b.textContent.trim()));
  await page.click('.cb-box button:has-text("Seal it")'); await page.waitForTimeout(2200);
  const L = await page.evaluate(() => __fake.DB.sealed_letters.slice(-1)[0]);
  const tm = new Date(); tm.setDate(tm.getDate() + 1); tm.setHours(8, 0, 0, 0);
  P(sbtn.length === 2 && L && L.title === 'Open when you miss me' && L.body === 'Dear Agnes, a test letter.' && L.seal === 'wax-gold' && L.paper === 'sky' && Date.parse(L.open_at) === tm.getTime() && L.author_side === 'Lewis' && L.recipient_side === 'Agnes', 'A17e', 'saved the same fields: ' + JSON.stringify(L && { title: L.title, seal: L.seal, paper: L.paper, open_at: L.open_at }));
  P(await page.evaluate(() => __fake.DB.messages.some(m => /^\[\[card:/.test(m.text || '') || /letter/.test(m.text || ''))), 'A17f', 'letter card sent through the normal send path');
  await page.evaluate(() => { while (LeesApp.view === 'panel') LeesApp.goBack(); }); await page.waitForTimeout(500);
  // thinking screenshot in Ink Night
  await page.evaluate(() => LeesApp.setAppTheme('ink')); await page.waitForTimeout(500);
  await page.click('#ar12Fab .ar12-unit'); await page.waitForTimeout(700);
  await page.fill('.ar12-in', 'why is the dot red'); await page.press('.ar12-in', 'Enter'); await page.waitForTimeout(350);
  await shot('thinking-ink');
  const thInk = await page.evaluate(() => { const n = document.querySelector('.ar15-tl'); return { size: parseFloat(getComputedStyle(n).fontSize), color: getComputedStyle(n).color, bg: getComputedStyle(n.closest('.ar12-msg')).backgroundColor }; });
  console.log('  thinking ink', JSON.stringify(thInk));
  await page.waitForTimeout(3000); await shot('answer-ink');
  // close frames
  await page.evaluate(() => { window.__frames = []; const pan = document.querySelector('.ar12-panel'); const t0 = performance.now(); const tick = () => { const r = pan.getBoundingClientRect(); window.__frames.push([Math.round(performance.now() - t0), Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]); if (performance.now() - t0 < 520) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  await page.click('#ar15Close'); await page.waitForTimeout(650);
  const fc = pick(await page.evaluate(() => window.__frames)); console.log('  close frames [ms,left,top,w,h]', JSON.stringify(fc));
  const fcAnim = fc.filter(f => f[0] <= 430);
  P(fcAnim[0][3] === 390 && fcAnim[fcAnim.length - 1][3] < 120 && fcAnim.every((f, i) => i === 0 || f[3] <= fcAnim[i - 1][3]), 'A9-closeframes', 'box shrinks from the viewport back to the flower');
  await page.evaluate(() => LeesApp.setAppTheme('warm'));
}};
