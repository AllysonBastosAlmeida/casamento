const ALLOWED_ORIGINS = new Set(['https://allysonbastosalmeida.github.io', 'http://localhost:5173', 'http://127.0.0.1:5173']);
const ADMIN_EMAIL = 'allyson.bastos@cleverconnection.com.br';
const INITIAL_GUEST_NAMES = [
  'Mãe', 'Tuanny', 'Clara', 'Flor', 'Marcel', 'Deivid', 'Luciana', 'DH', 'Nicole', 'Rafa',
  'Daya', 'Rafa filha', 'Antonella', 'Pedro', 'Milena', 'Enzo', 'Karajana', 'Wellignton',
  'Leandro', 'Gerson', 'André Porcinia', 'Jessica', 'Luís alga', 'Geraldo', 'Marlon', 'Louise',
  'Marjorie', 'Wilson', 'Celso', 'Camila', 'Davi', 'Danilo', 'Esposa', 'Ale **', 'Débora ***',
  'Alemão', 'Be', 'Custódio', 'Mayara', 'filho', 'Persio', 'Rozana', 'Gilson', 'esposa', 'filha',
  'Henrique', 'camila', 'Paulo', 'Katia', 'Rei', 'Thiago', 'bruna', '1 filho', '1 filho',
];
const INITIAL_GUESTS = INITIAL_GUEST_NAMES.map((name, index) => ({ id: `noivo-${index + 1}`, name, side: 'Noivo' }));
const cors = origin => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://allysonbastosalmeida.github.io',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400', Vary: 'Origin',
});
const json = (body, status, origin) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(origin) } });
const collectionFor = action => ({ createGift: 'gifts', createMessage: 'messages', createGuest: 'guests' })[action];
const parsePayload = value => {
  try { return JSON.parse(value); } catch {
    const legacy = String(value || '').match(/^\{side:([^,}]+),name:(.*)\}$/);
    return legacy ? { side: legacy[1], name: legacy[2] } : null;
  }
};

async function authorize(request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return false;
  const response = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', { headers: { Authorization: authorization } });
  if (!response.ok) return false;
  const profile = await response.json();
  return [profile.mail, profile.userPrincipalName].some(value => value?.toLowerCase() === ADMIN_EMAIL);
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (request.method !== 'POST' || !ALLOWED_ORIGINS.has(origin)) return json({ error: 'Requisição não permitida.' }, 403, origin);
  try {
    const { action, payload = {} } = await request.json();
    if (action === 'giftCatalog') {
      const result = await env.casamento_data.prepare("SELECT payload FROM records WHERE collection = 'gift_catalog' ORDER BY created_at").all();
      return json({ items: result.results.map(row => parsePayload(row.payload)).filter(Boolean) }, 200, origin);
    }
    if (action === 'settings') {
      const row = await env.casamento_data.prepare("SELECT payload FROM records WHERE id = 'site-settings' AND collection = 'settings'").first();
      return json({ settings: parsePayload(row?.payload) || { palette: 'rose' } }, 200, origin);
    }
    const adminAction = ['dashboard', 'createGuest', 'updateGuest', 'deleteGuest', 'deleteGift', 'upsertGiftDefinition', 'deleteGiftDefinition', 'updateSettings'].includes(action);
    if (adminAction && !(await authorize(request))) return json({ error: 'Acesso administrativo não autorizado.' }, 401, origin);

    if (action === 'dashboard') {
      const result = await env.casamento_data.prepare('SELECT id, collection, payload, created_at FROM records ORDER BY created_at DESC').all();
      const data = { gifts: [], messages: [], guests: [] };
      const deletedGuestIds = new Set();
      for (const row of result.results) {
        if (row.collection === 'guest_deletions') { deletedGuestIds.add(row.id); continue; }
        if (!data[row.collection]) continue;
        const payload = parsePayload(row.payload);
        if (payload) data[row.collection].push({ ...payload, id: row.id, createdAt: row.created_at });
      }
      const remoteGuestIds = new Set(data.guests.map(guest => guest.id));
      data.guests.push(...INITIAL_GUESTS.filter(guest => !remoteGuestIds.has(guest.id) && !deletedGuestIds.has(guest.id)));
      return json({ data }, 200, origin);
    }
    if (action === 'updateSettings') {
      const allowedPalettes = new Set(['rose', 'sage', 'blue', 'lavender', 'terracotta', 'champagne', 'olive', 'burgundy', 'navy', 'classic']);
      const record = { palette: allowedPalettes.has(payload.palette) ? payload.palette : 'rose' };
      await env.casamento_data.prepare("INSERT OR REPLACE INTO records (id, collection, payload, created_at) VALUES ('site-settings', 'settings', ?, ?)")
        .bind(JSON.stringify(record), new Date().toISOString()).run();
      return json({ settings: record }, 200, origin);
    }
    if (action === 'deleteGift') {
      const id = String(payload.id || '');
      if (!id) return json({ error: 'Presente inválido.' }, 400, origin);
      await env.casamento_data.prepare("DELETE FROM records WHERE id = ? AND collection = 'gifts'").bind(id).run();
      return json({ id }, 200, origin);
    }
    if (action === 'upsertGiftDefinition') {
      const id = String(payload.id || `custom-gift-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
      const name = String(payload.name || '').trim();
      const price = Number(payload.price);
      const image = String(payload.image || '');
      const emoji = String(payload.emoji || '🎁').slice(0, 12);
      if (!id || !name || !Number.isFinite(price) || price <= 0) return json({ error: 'Informe nome e valor válidos.' }, 400, origin);
      if (image.length > 900000) return json({ error: 'A imagem ficou muito grande. Escolha uma imagem menor.' }, 400, origin);
      const record = { id, name, price, image, emoji, deleted: false };
      await env.casamento_data.prepare("INSERT OR REPLACE INTO records (id, collection, payload, created_at) VALUES (?, 'gift_catalog', ?, ?)")
        .bind(`catalog:${id}`, JSON.stringify(record), new Date().toISOString()).run();
      return json({ item: record }, 200, origin);
    }
    if (action === 'deleteGiftDefinition') {
      const id = String(payload.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
      if (!id) return json({ error: 'Presente inválido.' }, 400, origin);
      const record = { id, deleted: true };
      await env.casamento_data.prepare("INSERT OR REPLACE INTO records (id, collection, payload, created_at) VALUES (?, 'gift_catalog', ?, ?)")
        .bind(`catalog:${id}`, JSON.stringify(record), new Date().toISOString()).run();
      return json({ item: record }, 200, origin);
    }
    if (action === 'deleteGuest') {
      const id = String(payload.id || '');
      if (!id) return json({ error: 'Convidado inválido.' }, 400, origin);
      await env.casamento_data.batch([
        env.casamento_data.prepare("DELETE FROM records WHERE id = ? AND collection = 'guests'").bind(id),
        env.casamento_data.prepare("INSERT OR REPLACE INTO records (id, collection, payload, created_at) VALUES (?, 'guest_deletions', '{}', ?)")
          .bind(id, new Date().toISOString()),
      ]);
      return json({ id: payload.id }, 200, origin);
    }
    if (action === 'updateGuest') {
      const id = String(payload.id || '');
      const name = String(payload.name || '').trim();
      const side = ['Noivo', 'Noiva', 'Ambos'].includes(payload.side) ? payload.side : 'Noivo';
      if (!id || !name) return json({ error: 'Convidado invÃ¡lido.' }, 400, origin);
      const confirmed = Boolean(payload.confirmed);
      const confirmedAt = confirmed ? String(payload.confirmedAt || new Date().toISOString()) : '';
      const record = { name, side, confirmed, confirmedAt };
      await env.casamento_data.batch([
        env.casamento_data.prepare("DELETE FROM records WHERE id = ? AND collection = 'guest_deletions'").bind(id),
        env.casamento_data.prepare("INSERT OR REPLACE INTO records (id, collection, payload, created_at) VALUES (?, 'guests', ?, ?)")
          .bind(id, JSON.stringify(record), new Date().toISOString()),
      ]);
      return json({ ...record, id }, 200, origin);
    }
    const collection = collectionFor(action);
    if (!collection) return json({ error: 'Ação inválida.' }, 400, origin);
    if (!payload.name?.trim()) return json({ error: 'Informe o nome.' }, 400, origin);
    if (action === 'createMessage' && !payload.message?.trim()) return json({ error: 'Informe a mensagem.' }, 400, origin);
    if (action === 'createGift' && (!payload.giftName?.trim() || !Number.isFinite(Number(payload.value)) || Number(payload.value) <= 0)) {
      return json({ error: 'Presente ou valor inválido.' }, 400, origin);
    }
    const id = globalThis.crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await env.casamento_data.prepare('INSERT INTO records (id, collection, payload, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, collection, JSON.stringify(payload), createdAt).run();
    return json({ ...payload, id, createdAt }, 200, origin);
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Falha ao salvar.' }, 500, origin); }
}
