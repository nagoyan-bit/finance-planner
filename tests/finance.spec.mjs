import { test, expect } from '@playwright/test';
for (const viewport of [{width:1280,height:800},{width:390,height:844}]) {
 test('finance workflow '+viewport.width,async({browser})=>{
  const page=await browser.newPage({viewport});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/index.html');
  await page.evaluate(()=>{
   const s=blank();s.cash=100000;s.bud.total=50000;s.cfg.living=40000;s.cfg.free=10000;
   s.debts=[{id:'d1',name:'テスト借入',bal:20000,bal0:20000,min:2000,rate:0,day:28}];
   localStorage.setItem('dp',JSON.stringify(s));
  });
  await page.reload();
  await page.getByRole('navigation').getByRole('button',{name:'家計簿'}).click();
  await page.locator('#ta').fill('1000');await page.locator('#tp').selectOption('cash');
  await page.locator('.formmain').getByRole('button',{name:'登録',exact:true}).click();
  expect(await page.evaluate(()=>({cash:S.cash,tx:S.tx.length}))).toEqual({cash:99000,tx:1});
  await page.getByRole('navigation').getByRole('button',{name:'収入配分'}).click();
  await page.locator('#ia').fill('20000');await page.locator('.formmain').getByRole('button',{name:'登録',exact:true}).click();
  expect(await page.evaluate(()=>({cash:S.cash,inc:S.inc.length}))).toEqual({cash:119000,inc:1});
  await page.getByRole('navigation').getByRole('button',{name:'借金'}).click();
  await page.locator('#ra').fill('3000');await page.locator('#ri').fill('100');await page.locator('.formmain').getByRole('button',{name:'実績登録',exact:true}).click();
  expect(await page.evaluate(()=>({cash:S.cash,debt:S.debts[0].bal}))).toEqual({cash:116000,debt:17100});
  for(const name of ['予定','口座','設定','ホーム'])await page.getByRole('navigation').getByRole('button',{name}).click();
  expect(await page.evaluate(()=>validateBackup(JSON.parse(localStorage.getItem('dp'))))).toEqual([]);
  await page.reload();expect(await page.evaluate(()=>S.cash)).toBe(116000);
  expect(errors).toEqual([]);
  await page.close();
 });
}

for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
 test('v5.9 account and forecast regression '+viewport.width,async({browser})=>{
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/index.html');
  await page.evaluate(()=>{const s=blank();s.accts=[{id:'a',name:'給与',purpose:'給与受取',bal:70000},{id:'b',name:'返済',purpose:'返済',bal:30000},{id:'e',name:'貯金',emg:'1',bal:5000}];s.cash=100000;s.emerg=5000;s.debts=[{id:'d',name:'借入',bal:20000,bal0:20000,min:2000,rate:0,acct:'b'}];s.bud.total=20000;localStorage.setItem('dp',JSON.stringify(s))});
  await page.reload();
  await page.getByRole('navigation').getByRole('button',{name:'口座',exact:true}).click();
  await page.locator('#xf').selectOption('a');await page.locator('#xt').selectOption('b');await page.locator('#xa').fill('10000');await page.getByRole('button',{name:'振替',exact:true}).click();
  expect(await page.evaluate(()=>[S.cash,S.emerg,S.accts[0].bal,S.accts[1].bal])).toEqual([100000,5000,60000,40000]);
  await page.getByRole('navigation').getByRole('button',{name:'借金'}).click();
  await page.locator('#ra').fill('3000');await page.locator('#ri').fill('100');await page.locator('.formmain').getByRole('button',{name:'実績登録',exact:true}).click();
  expect(await page.evaluate(()=>[S.cash,S.debts[0].bal,S.accts[1].bal])).toEqual([97000,17100,37000]);
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'↶ 元に戻す'}).click();
  expect(await page.evaluate(()=>[S.cash,S.debts[0].bal,S.accts[1].bal])).toEqual([100000,20000,40000]);
  await page.getByRole('navigation').getByRole('button',{name:'ホーム'}).click();
  expect(await page.evaluate(()=>{const raw=JSON.stringify(S);dailyForecast(90);sim(strat);transferAdvice(30);return raw===JSON.stringify(S)})).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  await page.reload();expect(await page.evaluate(()=>S.cash)).toBe(100000);expect(errors).toEqual([]);await page.close();
 });
}


test('shift overlap detection and batch skip',async({page})=>{
 await page.goto('http://127.0.0.1:8000/index.html');
 const result=await page.evaluate(()=>{
  const shift=(date,start,end,mode='hourly')=>({date,start,end,mode});
  const sameDay=shiftOverlaps(shift('2026-11-25','17:00','22:00'),[shift('2026-11-25','21:00','23:00')]);
  const overnight=shiftOverlaps(shift('2026-11-25','23:00','02:00'),[shift('2026-11-26','01:00','04:00')]);
  const adjacent=shiftOverlaps(shift('2026-11-25','17:00','22:00'),[shift('2026-11-25','22:00','23:00')]);
  const separate=shiftOverlaps(shift('2026-11-25','17:00','22:00'),[shift('2026-11-26','17:00','22:00')]);
  const daily=shiftOverlaps(shift('2026-11-25','','','daily'),[shift('2026-11-25','17:00','22:00')]);
  return {sameDay,overnight,adjacent,separate,daily};
 });
 expect(result).toEqual({sameDay:true,overnight:true,adjacent:false,separate:false,daily:false});
});
