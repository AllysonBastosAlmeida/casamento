import assert from 'node:assert/strict';
import { createPixPayload } from '../src/utils/pix.js';

const parse = payload => {
  const fields = new Map();
  for (let offset = 0; offset < payload.length;) {
    const id = payload.slice(offset, offset + 2);
    const length = Number(payload.slice(offset + 2, offset + 4));
    fields.set(id, payload.slice(offset + 4, offset + 4 + length));
    offset += 4 + length;
  }
  return fields;
};

const crc16 = value => {
  let crc = 0xffff;
  for (const character of value) {
    crc ^= character.charCodeAt(0) << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
};

const payload = createPixPayload({
  key: '453.633.528-50', receiver: 'MAYARA BARBOSA FELIPE', city: 'PRAIA GRANDE', amount: 650, reference: 'gift-1',
});
const fields = parse(payload);
const merchant = parse(fields.get('26'));
const additional = parse(fields.get('62'));

assert.equal(fields.get('00'), '01');
assert.equal(merchant.get('00'), 'BR.GOV.BCB.PIX');
assert.equal(merchant.get('01'), '45363352850');
assert.equal(fields.get('53'), '986');
assert.equal(fields.get('54'), '650.00');
assert.equal(fields.get('58'), 'BR');
assert.equal(fields.get('59'), 'MAYARA BARBOSA FELIPE');
assert.equal(fields.get('60'), 'PRAIA GRANDE');
assert.equal(additional.get('05'), 'GIFT1');
assert.equal(fields.get('63'), crc16(payload.slice(0, -4)));

console.log('PIX validado: CPF, valor R$ 650,00, recebedora, TXID e CRC corretos.');
