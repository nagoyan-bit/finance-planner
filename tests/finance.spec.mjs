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


test('shift templates preserve settings on mobile and old shift wage is a snapshot',async({browser})=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000/index.html');
 await page.evaluate(()=>{S.shiftJobs=[{id:'job1',name:'テスト勤務先',mode:'hourly',rate:1200,transport:500,close:31,pay:25,offset:1,nightMultiplier:1.25}];save()});
 await page.reload();await page.getByRole('navigation').getByRole('button',{name:'収入配分'}).click();
 await page.locator('#shiftcalendar .calday').nth(0).click();
 await page.locator('#bsstart').fill('17:30');await page.locator('#bsend').fill('22:30');await page.locator('#bsrest').fill('30');
 const templateFold=()=>page.locator('#boardeditor details').filter({hasText:'勤務パターンを保存・呼び出し'});const openTemplates=async()=>{if(!await templateFold().evaluate(el=>el.open))await templateFold().locator('summary').click()};
 await openTemplates();
 await page.locator('#bstname').fill('平日夕勤');await page.getByRole('button',{name:'現在の勤務条件を保存'}).click();
 expect(await page.evaluate(()=>S.shiftJobs[0].shiftTemplates.map(x=>({name:x.name,start:x.start,end:x.end,rest:x.rest,rate:x.rate})))).toEqual([{name:'平日夕勤',start:'17:30',end:'22:30',rest:30,rate:1200}]);
 await page.locator('#shiftcalendar .calday').nth(1).click();
 await openTemplates();
 await page.locator('#bstemplate').selectOption({label:'平日夕勤'});await page.getByRole('button',{name:'呼び出し',exact:true}).click();
 expect(await page.evaluate(()=>({start:document.querySelector('#bsstart').value,end:document.querySelector('#bsend').value,rest:document.querySelector('#bsrest').value,rate:boardDraft.rate}))).toEqual({start:'17:30',end:'22:30',rest:'30',rate:1200});
 const snapshot=await page.evaluate(()=>{const j=S.shiftJobs[0],s={id:'old',job:j.id,date:'2026-10-01',start:'17:00',end:'21:00',rest:0,minutes:240,mode:'hourly',rate:1000,transport:0,extra:0,nightMultiplier:1};S.shifts.push(s);const before=shiftEstimate(s);updateShiftJob(j,{rate:1500,transport:1000});return {savedRate:s.rate,payBefore:before,payAfter:shiftEstimate(s),jobRate:j.rate}});
 const color=page.locator('input[type="color"][data-k="shiftJobs.0.color"]');
 expect(await color.count()).toBe(1);
 await color.evaluate(el=>{el.value='#f07f32';el.dispatchEvent(new Event('change',{bubbles:true}))});
 expect(await page.evaluate(()=>({stored:S.shiftJobs[0].color,shown:shiftJobColor(S.shiftJobs[0],0)}))).toEqual({stored:'#f07f32',shown:'#f07f32'});
 expect(snapshot).toEqual({savedRate:1000,payBefore:4000,payAfter:4000,jobRate:1500});expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);await page.close();
});


test('purpose savings stay protected from allocation and forecasts',async({page})=>{
 await page.goto('http://127.0.0.1:8000/index.html');
 await page.evaluate(()=>{const s=blank();s.accts=[{id:'salary',name:'給与',purpose:'給与受取',bal:100000},{id:'goal',name:'旅行積立',purpose:'目的別貯金',bal:50000},{id:'emg',name:'緊急貯金',emg:'1',bal:20000}];s.moneyGoals=[{id:'g1',name:'旅行',target:60000,due:'2027-06-30',acct:'goal'}];s.debts=[{id:'d1',name:'借入',bal:150000,bal0:150000,min:0,rate:0}];s.cfg.living=0;s.cfg.free=0;s.cfg.emgTarget=0;s.cfg.fam=0;s.bud.total=0;s.plan={};s.inc=[];localStorage.setItem('dp',JSON.stringify(s))});
 await page.reload();
 const result=await page.evaluate(()=>{const before=S.accts.map(a=>a.bal),a=alloc(150000,'prio','test-income');return{cash:S.cash,emergency:S.emerg,protected:protectedGoalFunds(),usable:usableCash(),forecast:dailyForecast(0).end,simPool:sim('prio').pool,planned:a.items.reduce((n,x)=>n+x.amt,0),accountsBefore:before,accountsAfter:S.accts.map(x=>x.bal)}});
 expect(result.protected).toBe(50000);expect(result.cash).toBe(150000);expect(result.emergency).toBe(20000);expect(result.usable).toBe(100000);expect(result.forecast).toBe(100000);expect(result.simPool).toBe(100000);expect(result.planned).toBeLessThanOrEqual(100000);expect(result.accountsAfter).toEqual(result.accountsBefore);
});
