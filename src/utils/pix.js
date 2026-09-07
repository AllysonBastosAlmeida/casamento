const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;

const crc16 = value => {
  let crc = 0xffff;
  for (let i = 0; i < value.length; i += 1) {
    crc ^= value.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
};

const normalize = (value, limit) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 $%*+\-./:]/g, '').toUpperCase().slice(0, limit);
const normalizeReference = value => normalize(value, 25).replace(/[^A-Z0-9]/g, '') || '***';

export const createPixPayload = ({ key, receiver, city, amount, reference = 'CASAMENTO' }) => {
  const merchantAccount = field('00', 'BR.GOV.BCB.PIX') + field('01', key.replace(/\D/g, ''));
  const additional = field('05', normalizeReference(reference));
  const payload = field('00', '01') + field('26', merchantAccount) + field('52', '0000') + field('53', '986') +
    field('54', Number(amount).toFixed(2)) + field('58', 'BR') + field('59', normalize(receiver, 25)) +
    field('60', normalize(city, 15)) + field('62', additional) + '6304';
  return payload + crc16(payload);
};
