import {test,expect} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const url=pathToFileURL(path.resolve('index.html')).href;
const go=async(page,route='home')=>{await page.goto(url+'#'+route);await expect(page.locator('#main h1')).toBeVisible();};
test('all chapters and workspaces render offline without errors or horizontal overflow',async({page})=>{
 const errors=[],remote=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
 for(const route of ['home',...Array.from({length:10},(_,i)=>'lesson-'+(i+1)),'lab','practice','research','sources','journal','portfolio']){
  await go(page,route);await expect(page.locator('#main')).not.toContainText('undefined');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route).toBe(true);
 }
 expect(errors).toEqual([]);expect(remote).toEqual([]);
 await page.goto(url+'#lesson-3');await expect(page.locator('math')).toHaveCount(2);await expect(page.locator('math').first()).toContainText('Π');
});
test('payoff calculations, fee scaling, spreads and risk boundaries',async({page})=>{
 await go(page,'lab');const result=await page.evaluate(()=>{const m=window.OptionMath,a={k:100,p:5,k2:110,p2:2,stock:100,n:1,fee:0};return{call:m.payoff(103,a,'longcall'),put:m.payoff(90,a,'longput'),shortCall:m.payoff(120,a,'shortcall'),shortPut:m.payoff(0,a,'shortput'),spread:m.payoff(115,a,'bullcall'),covered:m.payoff(130,{...a,k:110,p:2},'coveredcall'),protected:m.payoff(0,a,'protectiveput'),straddle:m.payoff(100,a,'straddle'),scaled:m.payoff(110,{...a,n:2,fee:2.6},'longcall'),spreadStats:m.payoffStats(a,'bullcall'),unlimited:m.payoffStats(a,'shortcall').low};});
 expect(result).toMatchObject({call:-200,put:500,shortCall:-1500,shortPut:-9500,spread:700,covered:1200,protected:-500,straddle:-700,scaled:997.4});expect(result.spreadStats).toMatchObject({low:-300,high:700,be:[103],cash:300});expect(result.unlimited).toBe(-Infinity);
 const edge=await page.evaluate(()=>{const a={k:100,p:5,k2:110,p2:2,stock:80,n:1,fee:0};return{protected:OptionMath.payoffStats(a,'protectiveput').be,fees:OptionMath.payoffStats({...a,fee:600},'shortcall').be};});expect(edge.protected).toEqual([]);expect(edge.fees).toEqual([]);
 await page.locator('#payoff-strategy').selectOption('bullcall');await expect(page.locator('#payoff-stats')).toContainText('$700.00');await page.locator('#payoff-k2').fill('90');await expect(page.locator('#payoff-error')).toContainText('K₂ > K');await expect(page.locator('#payoff-chart svg')).toHaveCount(0);
});
test('BSM matches reference values, parity and finite difference Greeks',async({page})=>{
 await go(page,'lab');const m=await page.evaluate(()=>{const a={s:100,k:100,days:365,iv:20,r:5,type:'call'},m=window.OptionMath,c=m.bsm(a),p=m.bsm({...a,type:'put'}),ds=.01,dv=.01;return{c,p,parity:c.price-p.price,deltaFD:(m.bsm({...a,s:100+ds}).price-m.bsm({...a,s:100-ds}).price)/(2*ds),vegaFD:(m.bsm({...a,iv:20+dv}).price-m.bsm({...a,iv:20-dv}).price)/(2*dv),thetaFD:m.bsm({...a,days:364}).price-c.price};});
 expect(m.c.price).toBeCloseTo(10.4506,3);expect(m.p.price).toBeCloseTo(5.5735,3);expect(m.parity).toBeCloseTo(100-100*Math.exp(-.05),6);expect(m.c.delta).toBeCloseTo(m.deltaFD,4);expect(m.c.vega).toBeCloseTo(m.vegaFD,4);expect(m.c.theta).toBeCloseTo(m.thetaFD,3);
 await page.getByRole('button',{name:'定价与 Greeks',exact:true}).click();await page.locator('#price-s').fill('110');await expect(page.locator('#price-s-value')).toHaveText('110');await expect(page.locator('#pricing-output')).toContainText('Delta');
 await page.getByRole('button',{name:'财报与 IV',exact:true}).click();await expect(page.locator('#vol-output .negative')).toBeVisible();
});
test('quiz persists completion only after correct answers',async({page})=>{
 await go(page,'lesson-1');await page.locator('[name=q0][value="0"]').check();await page.locator('[name=q1][value="0"]').check();await page.locator('#lesson-quiz button').click();await expect(page.locator('#side-progress-text')).toHaveText('0 / 10');
 await page.locator('[name=q0][value="2"]').check();await page.locator('[name=q1][value="1"]').check();await page.locator('#lesson-quiz button').click();await expect(page.locator('#side-progress-text')).toHaveText('1 / 10');await page.reload();await expect(page.locator('#side-progress-text')).toHaveText('1 / 10');
});
test('paper order distinguishes pending, filled, closing fees and saves a journal',async({page})=>{
 await go(page,'practice');await page.locator('#trade-limit').fill('4.9');await page.locator('#trade-order button').click();await expect(page.locator('#main')).toContainText('PENDING');await expect(page.locator('#main')).not.toContainText('Bid 估计可平仓净盈亏');await page.locator('[data-action=cancel-order]').click();
 await page.locator('#trade-limit').fill('5');await page.locator('#trade-n').fill('2');await page.locator('#trade-order button').click();await expect(page.locator('#main')).toContainText('$1,001.30');await page.locator('[data-action=close-trade]').click();await expect(page.locator('#main')).toContainText('-$42.60');await page.locator('[data-action=trade-to-journal]').click();await go(page,'journal');await expect(page.locator('.journal-entry')).toHaveCount(1);await expect(page.locator('.journal-entry')).toContainText('-$42.60');
});
test('CSV import handles BOM, quoted fields, rejects wrong currency and renders local concentration',async({page})=>{
 await go(page,'portfolio');const csv='\uFEFFTicker,Quantity,AverageCost,LastPrice,Sector,Currency\r\nDEMO-A,150,80,100,"Technology, software",USD\r\nDEMO-B,50,120,110,Health,USD\r\n';
 await page.locator('#holding-file').setInputFiles({name:'holdings.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await expect(page.locator('#holding-analysis')).toContainText('$20,500.00');await expect(page.locator('#holding-analysis')).toContainText('73.2%');await expect(page.locator('#holding-analysis')).toContainText('Technology, software');await expect(page.locator('#holding-analysis')).toContainText('1 组');
 await page.locator('#holding-file').setInputFiles({name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from(csv.replaceAll('USD','EUR'))});await expect(page.locator('#holding-error')).toContainText('不是 USD');await expect(page.locator('#holding-analysis')).toContainText('$20,500.00');
 await page.reload();await expect(page.locator('.portfolio-table')).toHaveCount(0);
});
test('research and notes keep user text inert and export a JSON backup',async({page})=>{
 await go(page,'journal');await page.locator('[name=title]').fill('<img src=x onerror=alert(1)>');await page.locator('[name=body]').fill('Evidence\nSecond line');await page.locator('#journal-form button[type=submit]').click();await expect(page.locator('.journal-entry h3')).toHaveText('<img src=x onerror=alert(1)>');await expect(page.locator('.journal-entry img')).toHaveCount(0);const download=page.waitForEvent('download');await page.locator('[data-action=export-notes]').click();expect((await download).suggestedFilename()).toBe('options-learning-backup.json');
});
test('source filters and industry workspaces are functional',async({page})=>{
 await go(page,'sources');await expect(page.locator('.source-card')).toHaveCount(15);await page.locator('#source-search').fill('Greeks');await expect(page.locator('.source-card')).toHaveCount(1);await page.locator('#source-search').fill('');await page.locator('[data-source-kind="风险"]').click();await expect(page.locator('.source-card')).toHaveCount(3);
 await go(page,'research');await page.locator('[data-sector=healthcare]').click();await expect(page.locator('.research-hero')).toContainText('医疗与生物科技');
});
test('mobile pages fit viewport and navigation opens and closes',async({page})=>{
 await page.setViewportSize({width:390,height:844});for(const route of ['home','lesson-3','lesson-4','lesson-5','lab','practice','research','sources','journal','portfolio']){await go(page,route);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route).toBe(true);}
 await page.locator('#menu-button').click();await expect(page.locator('#menu-button')).toHaveAttribute('aria-expanded','true');await page.locator('.sidebar [data-nav=home]').click();await expect(page.locator('#menu-button')).toHaveAttribute('aria-expanded','false');await expect(page.locator('.hero')).toBeVisible();
});
