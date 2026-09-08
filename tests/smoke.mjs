import { chromium } from 'playwright-core';

const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = (process.env.TEST_BASE_URL || 'http://127.0.0.1:5173/').replace(/\/?$/, '/');
const browser = await chromium.launch({ executablePath, headless: true });
const errors = [];
const recordBrowserError = (scope, message) => {
  if (message.includes('google is not defined') && message.includes('maps.gstatic.com')) return;
  errors.push(`${scope}: ${message}`);
};

for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', error => recordBrowserError(viewport.name, `${error.message}\n${error.stack || ''}`));
  page.on('console', message => { if (message.type() === 'error') recordBrowserError(viewport.name, message.text()); });
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
    if (copyStyle.color !== 'rgb(63, 56, 58)' || copyStyle.weight !== 500 || copyStyle.opacity !== '1') {
      throw new Error(`mobile: contraste do texto descritivo inválido (${JSON.stringify(copyStyle)}).`);
    }
  }
  await page.locator('.gift-card .text-button').first().click();
  await page.locator('.pix-box svg').waitFor();
  if (viewport.name === 'mobile') {
    const readStyle = locator => locator.evaluate(element => {
      const style = element.ownerDocument.defaultView.getComputedStyle(element);
      return { color: style.color, weight: Number(style.fontWeight), opacity: style.opacity };
    });
    const modalStyles = {
      value: await readStyle(page.locator('.quota-form .pix-box strong')),
      copy: await readStyle(page.locator('.modal .pix-box .text-button')),
      date: await readStyle(page.locator('.rsvp-deadline strong')),
    };
    if (modalStyles.value.weight < 700 || modalStyles.value.opacity !== '1') throw new Error(`mobile: valor do modal sem contraste (${JSON.stringify(modalStyles.value)}).`);
    if (modalStyles.copy.color !== 'rgb(91, 39, 51)' || modalStyles.copy.weight < 700 || modalStyles.copy.opacity !== '1') throw new Error(`mobile: copiar PIX sem contraste (${JSON.stringify(modalStyles.copy)}).`);
    if (modalStyles.date.weight < 700 || modalStyles.date.opacity !== '1') throw new Error(`mobile: data limite sem contraste (${JSON.stringify(modalStyles.date)}).`);
  }
  if (await page.locator('.modal input[type="email"]').count()) throw new Error(`${viewport.name}: campo de e-mail ainda aparece no presente.`);
  await page.locator('.modal-close').click();
  await page.locator('select[name="children"]').selectOption('2');
  const childNames = page.locator('textarea[name="childrenNames"]');
  if (await childNames.count() !== 1 || !(await childNames.getAttribute('required') !== null)) throw new Error(`${viewport.name}: nomes das crianças não foram exigidos.`);
  const decline = page.locator('input[name="attending"][value="nao"]');
  await decline.check();
  if (await page.locator('textarea[name="companions"]').count()) throw new Error(`${viewport.name}: acompanhantes aparece para ausência.`);
  if (await page.locator('textarea[name="childrenNames"]').count()) throw new Error(`${viewport.name}: nomes das crianças aparecem para ausência.`);
  if (await page.locator('input[name="phone"]').count() !== 1) throw new Error(`${viewport.name}: WhatsApp obrigatório não aparece para ausência.`);
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
