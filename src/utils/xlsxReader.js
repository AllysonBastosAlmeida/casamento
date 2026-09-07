import { unzipSync } from 'fflate';

const decode = bytes => new TextDecoder().decode(bytes);
const xml = bytes => new DOMParser().parseFromString(decode(bytes), 'application/xml');
const columnIndex = reference => {
  const letters = reference.match(/[A-Z]+/i)?.[0] || 'A';
  return [...letters.toUpperCase()].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
};
const excelDate = value => {
  const date = new Date((Number(value) - 25569) * 86400000);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR', { timeZone: 'UTC' });
};

export function readWorksheet(buffer, requestedSheet) {
  const files = unzipSync(new Uint8Array(buffer));
  const workbook = xml(files['xl/workbook.xml']);
  const relationships = xml(files['xl/_rels/workbook.xml.rels']);
  const sheet = [...workbook.getElementsByTagName('sheet')].find(item => item.getAttribute('name') === requestedSheet);
  if (!sheet) throw new Error(`A aba ${requestedSheet} não existe no arquivo baixado.`);
  const relationshipId = sheet.getAttribute('r:id');
  const relationship = [...relationships.getElementsByTagName('Relationship')]
    .find(item => item.getAttribute('Id') === relationshipId);
  const target = relationship?.getAttribute('Target')?.replace(/^\//, '') || '';
  const sheetPath = target.startsWith('xl/') ? target : `xl/${target}`;
  if (!files[sheetPath]) throw new Error(`Não foi possível localizar os dados da aba ${requestedSheet}.`);

  const sharedStrings = files['xl/sharedStrings.xml']
    ? [...xml(files['xl/sharedStrings.xml']).getElementsByTagName('si')]
      .map(item => [...item.getElementsByTagName('t')].map(text => text.textContent || '').join(''))
    : [];
  const dateStyles = new Set();
  if (files['xl/styles.xml']) {
    const styles = xml(files['xl/styles.xml']);
    const customDateFormats = new Set([...styles.getElementsByTagName('numFmt')]
      .filter(item => /[dmyhs]/i.test(item.getAttribute('formatCode') || ''))
      .map(item => Number(item.getAttribute('numFmtId'))));
    const xfs = styles.getElementsByTagName('cellXfs')[0];
    [...(xfs?.getElementsByTagName('xf') || [])].forEach((item, index) => {
      const id = Number(item.getAttribute('numFmtId'));
      if ((id >= 14 && id <= 22) || customDateFormats.has(id)) dateStyles.add(index);
    });
  }

  const worksheet = xml(files[sheetPath]);
  return [...worksheet.getElementsByTagName('row')].map(row => {
    const values = [];
    [...row.getElementsByTagName('c')].forEach(cell => {
      const index = columnIndex(cell.getAttribute('r') || 'A1');
      const type = cell.getAttribute('t');
      const raw = cell.getElementsByTagName('v')[0]?.textContent
        ?? cell.getElementsByTagName('is')[0]?.textContent
        ?? '';
      if (type === 's') values[index] = sharedStrings[Number(raw)] ?? '';
      else if (type === 'inlineStr' || type === 'str') values[index] = raw;
      else values[index] = dateStyles.has(Number(cell.getAttribute('s'))) && raw ? excelDate(raw) : raw;
    });
    return values;
  });
}
