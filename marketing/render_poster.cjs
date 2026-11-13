// Render poster.html to poster.pdf (letter) and poster.png (preview), plus QR-only crops for scan testing.
const { chromium } = require('/home/coderx/Documents/Projects/language-learning-app/node_modules/playwright');
const path = require('path');
(async () => {
  const dir = __dirname;
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 2 });
  await pg.goto('file://' + path.join(dir, 'poster.html')); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
  await pg.pdf({ path: path.join(dir, 'poster.pdf'), width: '8.5in', height: '11in', printBackground: true, pageRanges: '1' });
  await pg.screenshot({ path: path.join(dir, 'poster.png') });
  for (const [scale, name] of [[2, 'qr_big.png'], [0.6, 'qr_small.png']]) {
    const p2 = await b.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: scale });
    await p2.goto('file://' + path.join(dir, 'poster.html')); await p2.evaluate(() => document.fonts.ready);
    await p2.locator('.qr').screenshot({ path: path.join(dir, name) }); await p2.close();
  }
  await b.close(); console.log('rendered');
})();
