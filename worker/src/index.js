const FORM_URL = 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=mMuNT2lPW0W8lKHJo5gkCahteIMPHnhMiD6mzH1bcM5UNzE1TThGRjNYWExNVFZMT1o5V0NCTUVJNS4u';
const ALLOWED_ORIGINS = new Set(['https://allysonbastosalmeida.github.io', 'http://localhost:5173', 'http://127.0.0.1:5173']);
const cors = origin => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://allysonbastosalmeida.github.io',
  'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400', Vary: 'Origin',
});
const json = (body, status, origin) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(origin) } });
const answer = (questions, title, value) => {
  const question = questions.find(item => item.title === title);
  return question && value !== undefined && value !== '' ? { questionId: question.id, answer1: String(value) } : null;
};
async function submit(payload) {
  const pageResponse = await fetch(FORM_URL);
  if (!pageResponse.ok) throw new Error('Não foi possível iniciar uma sessão no Microsoft Forms.');
  const html = await pageResponse.text();
  const match = html.match(/window\.OfficeFormServerInfo\s*=\s*(\{.*?\});/s);
  if (!match) throw new Error('A Microsoft alterou o formato do formulário.');
  const info = JSON.parse(match[1]);
  const headers = { '__RequestVerificationToken': info.antiForgeryToken, 'X-UserSessionId': info.serverSessionId, 'x-ms-form-request-source': 'ms-formweb' };
  const cookie = pageResponse.headers.get('set-cookie');
  if (cookie) headers.Cookie = cookie.split(',').map(value => value.trim().split(';')[0]).join('; ');
  const definitionResponse = await fetch(info.prefetchFormUrl, { headers });
  if (!definitionResponse.ok) throw new Error('Não foi possível carregar as perguntas do Forms.');
  const definition = await definitionResponse.json();
  const attending = payload.attending === 'sim';
  const answers = [
    answer(definition.questions, 'Nome Completo', payload.name.trim()),
    answer(definition.questions, 'Presença', attending ? 'Sim, estarei' : 'Não poderei comparecer'),
    ...(attending ? [answer(definition.questions, 'Adultos', payload.adults || 1), answer(definition.questions, 'Crianças acima de 5 anos', payload.children || 0), answer(definition.questions, 'Acompanhantes', payload.companions?.trim()), answer(definition.questions, 'WhatsApp', payload.phone.trim())] : []),
    answer(definition.questions, 'Observações', payload.notes?.trim()),
  ].filter(Boolean);
  const now = new Date().toISOString();
  const responsesUrl = info.prefetchFormUrl.replace('/light/runtimeForms(', '/forms(').replace(/\?.*$/, '') + '/responses';
  const response = await fetch(responsesUrl, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json;charset=UTF-8' }, body: JSON.stringify({ startDate: now, submitDate: now, answers: JSON.stringify(answers), submitLanguage: 'pt-BR' }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.id) throw new Error(`O Forms recusou a resposta (${response.status}).`);
  return result.id;
}
export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'POST' || !ALLOWED_ORIGINS.has(origin)) return json({ error: 'Requisição não permitida.' }, 403, origin);
    try {
      const payload = await request.json();
      if (!payload.name?.trim() || !['sim', 'nao'].includes(payload.attending)) throw new Error('Preencha os campos obrigatórios.');
      if (payload.attending === 'sim' && !payload.phone?.trim()) throw new Error('Informe o WhatsApp.');
      return json({ ok: true, responseId: await submit(payload) }, 200, origin);
    } catch (error) { return json({ error: error instanceof Error ? error.message : 'Falha ao enviar.' }, 502, origin); }
  },
};
