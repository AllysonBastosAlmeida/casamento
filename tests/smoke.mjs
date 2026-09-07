import { chromium } from 'playwright-core';

const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = (process.env.TEST_BASE_URL || 'http://127.0.0.1:5173/').replace(/\/?$/, '/');
const browser = await chromium.launch({ executablePath, headless: true });
const errors = [];

for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', error => errors.push(`${viewport.name}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${viewport.name}: ${message.text()}`); });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('h1').waitFor();
  if (await page.locator('.gift-card').count() !== 10) throw new Error(`${viewport.name}: paginação de presentes inválida.`);
  if (viewport.name === 'mobile') {
    const giftPriceStyle = await page.locator('.gift-card strong').first().evaluate(element => {
      const style = element.ownerDocument.defaultView.getComputedStyle(element);
      return { color: style.color, weight: Number(style.fontWeight) };
    });
    if (giftPriceStyle.color !== 'rgb(120, 63, 77)' || giftPriceStyle.weight < 700) {
      throw new Error(`mobile: contraste do valor do presente inválido (${JSON.stringify(giftPriceStyle)}).`);
    }
    const copyStyle = await page.locator('.intro > p:not(.eyebrow)').evaluate(element => {
      const style = element.ownerDocument.defaultView.getComputedStyle(element);
      return { color: style.color, weight: Number(style.fontWeight), opacity: style.opacity };
    });
    if (copyStyle.color !== 'rgb(36, 31, 32)' || copyStyle.weight < 700 || copyStyle.opacity !== '1') {
      throw new Error(`mobile: contraste do texto descritivo inválido (${JSON.stringify(copyStyle)}).`);
    }
  }
  await page.locator('.gift-card .text-button').first().click();
  await page.locator('.pix-box svg').waitFor();
  if (await page.locator('.modal input[type="email"]').count()) throw new Error(`${viewport.name}: campo de e-mail ainda aparece no presente.`);
  await page.locator('.modal-close').click();
  const decline = page.locator('input[name="attending"][value="nao"]');
  await decline.check();
  if (await page.locator('textarea[name="companions"]').count()) throw new Error(`${viewport.name}: acompanhantes aparece para ausência.`);
  if (await page.locator('input[name="phone"]').count()) throw new Error(`${viewport.name}: WhatsApp aparece para ausência.`);
  const mapHref = await page.getByRole('link', { name: /traçar rota/i }).getAttribute('href');
  if (!mapHref?.includes('google.com/maps/dir')) throw new Error(`${viewport.name}: link de rota inválido.`);
  await page.close();
}

const admin = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await admin.goto(`${baseUrl}#/admin`);
await admin.locator('input[name="pin"]').fill('casamento2027');
await admin.getByRole('button', { name: 'Entrar' }).click();
await admin.getByText('Gestão do casamento').waitFor();
await admin.close();
await browser.close();

if (errors.length) throw new Error(`Erros do navegador:\n${errors.join('\n')}`);
console.log('Smoke tests concluídos em desktop, mobile e painel administrativo.');
