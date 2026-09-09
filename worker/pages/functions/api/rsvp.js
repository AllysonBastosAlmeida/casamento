import handler from '../../../src/index.js';

const normalizedPhone = value => String(value || '').replace(/\D/g, '');

export const onRequest = async context => {
  const payload = await context.request.clone().json().catch(() => null);
  const response = await handler.fetch(context.request);
  if (!response.ok || !payload?.name?.trim() || !context.env.casamento_data) return response;

  const result = await response.clone().json().catch(() => ({}));
  if (!result.ok) return response;

  const phone = normalizedPhone(payload.phone);
  const id = phone ? `rsvp:${phone}` : `rsvp:${globalThis.crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  const record = {
    name: String(payload.name || '').trim(),
    attending: payload.attending === 'nao' ? 'nao' : 'sim',
    adults: Number(payload.adults || (payload.attending === 'nao' ? 0 : 1)),
    children: Number(payload.children || 0),
    companions: String(payload.companions || '').trim(),
    childrenNames: String(payload.childrenNames || '').trim(),
    phone: String(payload.phone || '').trim(),
    notes: String(payload.notes || '').trim(),
    source: 'site',
  };

  try {
    await context.env.casamento_data.prepare("INSERT OR REPLACE INTO records (id, collection, payload, created_at) VALUES (?, 'rsvps', ?, ?)")
      .bind(id, JSON.stringify(record), createdAt).run();
  } catch (error) {
    console.error('A resposta chegou ao Forms, mas não foi espelhada no painel.', error);
  }
  return response;
};
