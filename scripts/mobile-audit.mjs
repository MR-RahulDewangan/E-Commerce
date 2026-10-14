import { chromium } from 'playwright';

const VIEWPORTS = [
  { name: 'Android Compact (360px)', width: 360, height: 740 },
  { name: 'iPhone SE (375px)', width: 375, height: 667 },
  { name: 'iPhone 13/14/15 (390px)', width: 390, height: 844 },
  { name: 'Pixel 7 (412px)', width: 412, height: 915 },
  { name: 'iPhone Pro Max (430px)', width: 430, height: 932 },
];

const ROUTES = [
  '/',
  '/products',
  '/products/kannauj-mitti-attar-monsoon-earth',
  '/cart',
  '/checkout',
  '/login',
];

async function runAudit() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('--- Starting Mobile Phone Responsiveness Audit ---');
  let hasOverflowIssues = false;
  const issues = [];

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const route of ROUTES) {
      const url = `http://localhost:3000${route}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) {
        // Fallback for slower load
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      }

      const overflowData = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const hasOverflow = docWidth > winWidth;
        
        let offendingElements = [];
        if (hasOverflow) {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const rect = el.getBoundingClientRect();
            if (rect.right > winWidth + 1) {
              offendingElements.push({
                tag: el.tagName,
                className: (el.className || '').toString().slice(0, 80),
                right: Math.round(rect.right),
                width: Math.round(rect.width)
              });
              if (offendingElements.length >= 5) break;
            }
          }
        }

        return { docWidth, winWidth, hasOverflow, offendingElements };
      });

      if (overflowData.hasOverflow) {
        hasOverflowIssues = true;
        issues.push({
          viewport: vp.name,
          route,
          docWidth: overflowData.docWidth,
          winWidth: overflowData.winWidth,
          offending: overflowData.offendingElements
        });
        console.error(`[OVERFLOW] ${vp.name} on ${route}: docWidth=${overflowData.docWidth}px > winWidth=${overflowData.winWidth}px`);
        console.error('Offending elements:', JSON.stringify(overflowData.offendingElements, null, 2));
      } else {
        console.log(`[PASS] ${vp.name} on ${route} - clean width (${overflowData.docWidth}px <= ${overflowData.winWidth}px)`);
      }
    }
  }

  await browser.close();
  console.log('--- Audit Finished ---');
  if (hasOverflowIssues) {
    console.log(`Total overflow issues detected: ${issues.length}`);
  } else {
    console.log('No horizontal overflow detected on any test viewport!');
  }
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
