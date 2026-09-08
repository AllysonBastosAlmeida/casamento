const FORM_URL = 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=mMuNT2lPW0W8lKHJo5gkCahteIMPHnhMiD6mzH1bcM5UNzE1TThGRjNYWExNVFZMT1o5V0NCTUVJNS4u';

const readBody = request => new Promise((resolve, reject) => {
  let body = '';
  request.on('data', chunk => { body += chunk; });
  request.on('end', () => {
    try { resolve(JSON.parse(body || '{}')); } catch (error) { reject(error); }
  });
  request.on('error', reject);
});

const cookiesFrom = response => (response.headers.getSetCookie?.() || [])
  .map(value => value.split(';', 1)[0]).join('; ');

const answer = (questions, title, value) => {
  const question = questions.find(item => item.title === title);
  return question && value !== undefined && value !== ''
    ? { questionId: question.id, answer1: String(value) }
    : null;
};

async function submitToMicrosoftForms(payload) {
  const pageResponse = await fetch(FORM_URL);
  if (!pageResponse.ok) throw new Error('Não foi possível iniciar uma sessão no Microsoft Forms.');
  const html = await pageResponse.text();
  const match = html.match(/window\.OfficeFormServerInfo\s*=\s*(\{.*?\});/s);
  if (!match) throw new Error('A Microsoft alterou o formato da página do formulário.');
  const info = JSON.parse(match[1]);
  const headers = {
    '__RequestVerificationToken': info.antiForgeryToken,
    'X-UserSessionId': info.serverSessionId,
    'x-ms-form-request-source': 'ms-formweb',
  };
  const cookie = cookiesFrom(pageResponse);
  if (cookie) headers.Cookie = cookie;

  const definitionResponse = await fetch(info.prefetchFormUrl, { headers });
  if (!definitionResponse.ok) throw new Error('Não foi possível carregar as perguntas do Microsoft Forms.');
  const definition = await definitionResponse.json();
  const attending = payload.attending === 'sim';
  const childNamesQuestion = definition.questions.find(item => item.title === 'Nomes das crianças acima de 5 anos');
  const companions = payload.companions?.trim();
  const childrenNames = payload.childrenNames?.trim();
  const combinedCompanions = !childNamesQuestion && childrenNames
    ? [companions, `Crianças acima de 5 anos:\n${childrenNames}`].filter(Boolean).join('\n\n')
    : companions;
  const answers = [
    answer(definition.questions, 'Nome Completo', payload.name?.trim()),
    answer(definition.questions, 'Presença', attending ? 'Sim, estarei' : 'Não poderei comparecer'),
    ...(attending ? [
      answer(definition.questions, 'Adultos', payload.adults || 1),
      answer(definition.questions, 'Crianças acima de 5 anos', payload.children || 0),
      answer(definition.questions, 'Acompanhantes', combinedCompanions),
      answer(definition.questions, 'Nomes das crianças acima de 5 anos', childrenNames),
      answer(definition.questions, 'WhatsApp', payload.phone?.trim()),
    ] : []),
    answer(definition.questions, 'Observações', payload.notes?.trim()),
  ].filter(Boolean);

  const now = new Date().toISOString();
  const responsesUrl = info.prefetchFormUrl.replace('/light/runtimeForms(', '/forms(').replace(/\?.*$/, '') + '/responses';
  const submitResponse = await fetch(responsesUrl, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({ startDate: now, submitDate: now, answers: JSON.stringify(answers), submitLanguage: 'pt-BR' }),
  });
  const result = await submitResponse.json().catch(() => ({}));
  if (!submitResponse.ok) throw new Error(`O Microsoft Forms recusou a resposta (${submitResponse.status}).`);
  if (!result.id) throw new Error('O Microsoft Forms não confirmou o número da resposta.');
  return { ok: true, responseId: result.id };
}

export function microsoftFormsProxy() {
  return {
    name: 'microsoft-forms-rsvp-proxy',
    configureServer(server) {
      server.middlewares.use('/api/rsvp', async (request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end(JSON.stringify({ error: 'Método não permitido.' }));
          return;
        }
        try {
          const payload = await readBody(request);
          if (!payload.name?.trim() || !payload.attending) throw new Error('Preencha os campos obrigatórios.');
          if (payload.attending === 'sim' && !payload.phone?.trim()) throw new Error('Informe o WhatsApp.');
          if (payload.attending === 'sim' && Number(payload.children) > 0 && !payload.childrenNames?.trim()) throw new Error('Informe os nomes das crianças acima de 5 anos.');
          if (payload.attending === 'sim' && Number(payload.children) > 0 && payload.childrenNames.trim().split('\n').filter(Boolean).length !== Number(payload.children)) throw new Error('A quantidade de nomes das crianças não corresponde ao total informado.');
          response.end(JSON.stringify(await submitToMicrosoftForms(payload)));
        } catch (error) {
          response.statusCode = 502;
          response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Falha ao enviar.' }));
        }
      });
    },
  };
}
