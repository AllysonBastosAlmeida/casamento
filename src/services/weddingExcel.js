import { PublicClientApplication } from '@azure/msal-browser';
import { readWorksheet } from '../utils/xlsxReader.js';

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID || '2d7bcc44-8337-42ec-a3e2-6ba7c9bda91f';
// O arquivo "Orçamento Web" fica no drive usado por Clientes/Orçamentos,
// e não no drive principal (que contém as planilhas de materiais).
const driveId = import.meta.env.VITE_WEDDING_DRIVE_ID
  || import.meta.env.VITE_GRAPH_DRIVE_ID_CLIENTES
  || 'b!scYxP1iKHk-2Xn5kVVhFAGdG9X8BFZBGvt5w-aBi12Mo0YszQX9hSakmug3Ij2Qf';
const itemId = import.meta.env.VITE_GRAPH_ITEM_ORCAMENTOS || '';
const clientsItemId = import.meta.env.VITE_GRAPH_ITEM_CLIENTES || '01FWWAKIQQT5LZBQ5UGNBILG4UQ6VQGUJ3';
const weddingItemId = import.meta.env.VITE_WEDDING_WORKBOOK_ITEM_ID || clientsItemId;
const workbookName = import.meta.env.VITE_WEDDING_WORKBOOK_NAME || 'Orçamento Web';
const sheetName = import.meta.env.VITE_WEDDING_RSVP_SHEET || 'Form1';
const tableName = import.meta.env.VITE_WEDDING_RSVP_TABLE || 'Tabela11';
const redirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI || `${window.location.origin}${import.meta.env.BASE_URL}`;
const scopes = ['User.Read', 'Files.Read', 'Files.Read.All', 'Sites.Read.All'];
const authReturnKey = 'wedding-msal-return-hash';

const msal = new PublicClientApplication({
  auth: { clientId, authority: 'https://login.microsoftonline.com/common', redirectUri, navigateToLoginRequestUrl: false },
  cache: { cacheLocation: 'localStorage', storeAuthStateInCookie: false },
});

let initialization;
const initialize = () => {
  if (!initialization) initialization = (async () => {
    await msal.initialize();
    const response = await msal.handleRedirectPromise();
    if (response?.account) {
      msal.setActiveAccount(response.account);
      const returnHash = sessionStorage.getItem(authReturnKey);
      sessionStorage.removeItem(authReturnKey);
      if (returnHash) window.history.replaceState({}, document.title, `${window.location.pathname}${returnHash}`);
    }
  })();
  return initialization;
};

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const getToken = async () => {
  await initialize();
  let account = msal.getActiveAccount() || msal.getAllAccounts()[0];
  if (!account) {
    sessionStorage.setItem(authReturnKey, window.location.hash || '#/admin');
    await msal.loginRedirect({ scopes, prompt: 'select_account' });
    return new Promise(() => {});
  }
  msal.setActiveAccount(account);
  try {
    return (await msal.acquireTokenSilent({ scopes, account })).accessToken;
  } catch {
    sessionStorage.setItem(authReturnKey, window.location.hash || '#/admin');
    await msal.acquireTokenRedirect({ scopes, account });
    return new Promise(() => {});
  }
};

export const getMicrosoftAccessToken = getToken;
export const initializeMicrosoftAuth = initialize;

export const loadExcelRsvps = async () => {
  const token = await getToken();
  const encodedSheet = encodeURIComponent(sheetName);
  const headers = { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache' };
  const readSheet = async candidateId => {
    // Baixar o arquivo evita o cache independente do serviço Workbook do Graph,
    // que pode permanecer atrasado após uma resposta do Microsoft Forms.
    const contentUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${candidateId}/content`;
    const contentResponse = await fetch(contentUrl, { headers, cache: 'no-store' });
    if (contentResponse.ok) {
      try { return readWorksheet(await contentResponse.arrayBuffer(), sheetName); } catch { /* tenta a API Workbook abaixo */ }
    }
    const workbookBase = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${candidateId}/workbook/worksheets/${encodedSheet}`;
    const urls = [
      `${workbookBase}/tables/${encodeURIComponent(tableName)}/range`,
      `${workbookBase}/usedRange(valuesOnly=true)`,
    ];
    for (const url of urls) {
      const response = await fetch(url, { headers, cache: 'no-store' });
      if (response.ok) return (await response.json()).values || [];
    }
    return null;
  };

  let rows = null;
  const knownIds = [...new Set([weddingItemId, clientsItemId, itemId].filter(Boolean))];
  for (const candidateId of knownIds) {
    rows = await readSheet(candidateId);
    if (rows) break;
  }

  if (!rows) {
    const searchTerms = [workbookName, 'Orcamento Web'];
    for (const term of searchTerms) {
      const searchUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root/search(q='${encodeURIComponent(term)}')?$select=id,name,file&$top=50`;
      const searchResponse = await fetch(searchUrl, { headers });
      if (searchResponse.ok) {
        const files = (await searchResponse.json()).value || [];
        const orderedFiles = files
          .filter(entry => /\.xlsx$/i.test(entry.name || ''))
          .sort((a, b) => Number(normalize(b.name).includes(normalize(workbookName))) - Number(normalize(a.name).includes(normalize(workbookName))));
        for (const file of orderedFiles) {
          rows = await readSheet(file.id);
          if (rows) break;
        }
      }
      if (rows) break;
    }
  }

  if (!rows) throw new Error(`Localizei sua conta Microsoft, mas não encontrei a aba ${sheetName} no arquivo ${workbookName}.`);
  if (rows.length < 2) return [];
  const sheetHeaders = rows[0].map(normalize);
  const value = (row, ...names) => {
    for (const name of names) {
      const index = sheetHeaders.indexOf(name);
      if (index >= 0 && row[index] !== '' && row[index] != null) return row[index];
    }
    return '';
  };
  const responses = rows.slice(1).filter(row => row.some(Boolean)).map((row, index) => ({
    id: `excel-${value(row, 'id') || index + 1}`,
    // O Forms usa a coluna F para "Nome Completo". O fallback por posição
    // protege contra variações invisíveis no cabeçalho exportado pelo Excel.
    name: value(row, 'nomecompleto', 'nome') || row[5] || row[4] || '',
    attending: normalize(value(row, 'presenca1', 'presenca')).startsWith('sim') ? 'sim' : 'nao',
    adults: Number(value(row, 'adultos') || 0),
    children: Number(value(row, 'criancasacimade5anos') || 0),
    companions: value(row, 'acompanhantes'),
    phone: value(row, 'whatsapp'),
    notes: value(row, 'observacoes'),
    createdAt: value(row, 'horadaconclusao', 'horadeinicio'),
    source: 'excel',
  }));
  const latestByPhone = new Map();
  const withoutPhone = [];
  responses.forEach(response => {
    const phone = String(response.phone || '').replace(/\D/g, '');
    if (phone) latestByPhone.set(phone, response);
    else withoutPhone.push(response);
  });
  return [...withoutPhone, ...latestByPhone.values()];
};

export const hasMicrosoftSession = async () => {
  await initialize();
  return msal.getAllAccounts().length > 0;
};
