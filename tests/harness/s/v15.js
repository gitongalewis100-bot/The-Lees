module.exports = { run: async (page, shot, { signIn }) => {
  await page.evaluate(() => { localStorage.setItem('v12-guide-done-Lewis','1'); });
  await signIn(); await page.evaluate(() => { try { LeesV12.guide.stop(true); } catch(e){} });
  await shot('home');
  console.log('tile colours', JSON.stringify(await page.evaluate(() => { const l=(c)=>{const m=c.match(/[\d.]+/g).map(Number).slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*m[0]+.7152*m[1]+.0722*m[2]}; const out={}; for (const sel of ['.tools2 .navbtn','.hx9 .hx9-t']) { const n=document.querySelector(sel); const cs=getComputedStyle(n); out[sel]={bg:cs.backgroundColor,fg:cs.color,backdrop:cs.backdropFilter}; } return out; })));
  console.log('seen text', await page.evaluate(() => document.querySelector('.seen12') && document.querySelector('.seen12').className + ' | ' + document.querySelector('.seen12-t').textContent));
  await page.evaluate(() => LeesApp.openChat()); await page.waitForTimeout(900); await shot('chat-composer');
  await page.click('#footer .lp-plus'); await page.waitForTimeout(500); await shot('plus-menu');
  console.log('menu items', await page.evaluate(() => [...document.querySelectorAll('.v9-mi')].map(n=>n.textContent.trim()).join(',')));
  await page.keyboard.press('Escape');
  await page.evaluate(() => LeesApp.sheetOpen && 0);
  const stk = await page.evaluate(() => { const b=[...document.querySelectorAll('.v9-mi')].find(n=>/sticker/i.test(n.textContent)); if(b){b.click();return true;} return false; });
  await page.waitForTimeout(900); await shot('stickers');
  console.log('stickers', stk, await page.evaluate(() => { const g=document.querySelector('.v9-stk'); const sc=g&&g.closest('#sheetBody'); return g? g.children.length + ' buttons; sheetBody h=' + (sc&&sc.clientHeight) + ' scrollH=' + (sc&&sc.scrollHeight) + ' overflowY=' + (sc&&getComputedStyle(sc).overflowY) : 'no grid'; }));
  await page.evaluate(() => LeesApp.sheetClose());
  await page.evaluate(() => LeesApp.goBack()); await page.waitForTimeout(500);
  for (const [min, label] of [[0,'on'],[30,'seen'],[60*11,'off']]) {
    await page.evaluate(async (min) => { if (min > 300) { __fake.DB.activity_log.length = 0; await LeesV12._act.load(); } const m = __fake.DB.pair_members.find(r=>r.side==='Agnes'); m.last_seen_at = new Date(Date.now()-min*60000).toISOString(); }, min);
    await page.evaluate(async () => { await LeesApp.reloadAll(); LeesApp.renderHome(); }); await page.waitForTimeout(4800);
    console.log(label, await page.evaluate(() => { const e=document.querySelector('.seen12'); return e.className+' | '+e.querySelector('.seen12-t').textContent+' | color '+getComputedStyle(e).color; }));
    await shot('seen-'+label);
  }
  await page.evaluate(() => { const b=document.getElementById('ar12Fab'); window.__fabOk = b && !b.classList.contains('gone'); });
  console.log('flower on home visible', await page.evaluate(() => window.__fabOk));
  await page.click('#ar12Fab .ar12-unit'); await page.waitForTimeout(900); await shot('arten');
}};
