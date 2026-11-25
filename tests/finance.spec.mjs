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
