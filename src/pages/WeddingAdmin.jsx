import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, Cloud, Gift, Heart, LockKeyhole, Palette, Pencil, Plus, Printer, RefreshCw, Trash2, Users, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { colorPalettes, initialGuests } from '../config.js';
import { addGuest, deleteGift, deleteGuest, isDemoMode, loadDashboard, loadSiteSettings, saveSiteSettings, updateGuest } from '../services/weddingApi.js';
import { getMicrosoftAccessToken, loadExcelRsvps } from '../services/weddingExcel.js';

const formatDate = value => {
  if (!value) return '—';
  const match = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (match) { const [, d, m, y, h = '0', min = '0'] = match; return new Date(+y, +m - 1, +d, +h, +min).toLocaleString('pt-BR'); }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString('pt-BR');
};

const mergeRsvps = (...lists) => {
  const records = new Map();
  lists.flat().filter(Boolean).forEach(item => {
    const phone = String(item.phone || '').replace(/\D/g, '');
    records.set(phone ? `phone:${phone}` : `id:${item.id}`, item);
  });
  return [...records.values()].sort((a, b) => {
    const right = new Date(b.createdAt).getTime() || 0;
    const left = new Date(a.createdAt).getTime() || 0;
    return right - left;
  });
};

export function Login({ onLogin }) {
  const [error, setError] = useState(false);
  const submit = event => { event.preventDefault(); const pin = new FormData(event.currentTarget).get('pin'); if (pin === (import.meta.env.VITE_ADMIN_PIN || 'casamento2027')) onLogin(); else setError(true); };
  return <main className="admin-login"><form onSubmit={submit}><LockKeyhole /><p className="eyebrow">Área reservada</p><h1>Painel dos noivos</h1><p>Acesse para acompanhar confirmações, presentes e recados.</p><input name="pin" type="password" placeholder="PIN de acesso" autoFocus /><button className="button primary">Entrar</button>{error && <p className="form-error">PIN incorreto.</p>}<Link to="/"><ArrowLeft size={16} /> Voltar ao site</Link></form></main>;
}

function GuestColumn({ title, label, guests, onToggle, onEdit, onRemove }) {
  const ordered = [...guests].sort((a, b) => Number(Boolean(b.confirmed)) - Number(Boolean(a.confirmed)) || (a.confirmedAt || '').localeCompare(b.confirmedAt || ''));
  const confirmed = guests.filter(guest => guest.confirmed).length;
  return <section className="guest-column"><header><div><span>{label}</span><h3>{title}</h3></div><strong title={`${confirmed} confirmados de ${guests.length}`}>{confirmed}/{guests.length}</strong></header><div className="compact-guest-list">{ordered.map((guest, index) => <article className={guest.confirmed ? 'is-confirmed' : ''} key={guest.id}><label className="guest-check" title={guest.confirmed ? 'Remover confirmação' : 'Marcar como confirmado'}><input type="checkbox" checked={Boolean(guest.confirmed)} onChange={() => onToggle(guest)} /><span /></label><span className="guest-number">{index + 1}</span><strong title={guest.name}>{guest.name}</strong><div className="guest-actions"><button onClick={() => onEdit(guest)} aria-label={`Editar ${guest.name}`} title="Editar convidado"><Pencil size={14} /></button><button onClick={() => onRemove(guest)} aria-label={`Excluir ${guest.name}`} title="Excluir convidado"><Trash2 size={15} /></button></div></article>)}{!guests.length && <p className="empty">Nenhum convidado nesta lista.</p>}</div></section>;
}

function ConfirmationCard({ item }) {
  const adults = Number(item.adults || 0);
  const children = Number(item.children || 0);
  const adultNames = [item.name, ...String(item.companions || '').split('\n')].map(name => name.trim()).filter(Boolean).join('\n');
  return <article className={`confirmation-card ${item.attending}`}><header><div><strong>{item.name || 'Nome não informado'}</strong><span>{formatDate(item.createdAt)}</span></div><span className={`badge ${item.attending}`}>{item.attending === 'sim' ? 'Confirmado' : 'Não irá'}</span><span className="reception-check">Entrada&nbsp; □</span></header><div className="confirmation-details"><div className="people adults-people"><span>Adultos / acompanhantes ({adults})</span><strong>{adultNames || 'Nenhum informado'}</strong></div><div className="people children-people"><span>Crianças acima de 5 anos ({children})</span><strong>{item.childrenNames || 'Nenhuma'}</strong></div><div className="people-total"><span>Total de pessoas</span><strong>{adults + children}</strong></div><div><span>WhatsApp</span><strong>{item.phone || 'Não informado'}</strong></div><div className="notes"><span>Observações</span><strong>{item.notes || 'Nenhuma observação'}</strong></div></div></article>;
}

export default function WeddingAdmin() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('wedding-admin') === '1');
  const [data, setData] = useState({ rsvps: [], gifts: [], messages: [], guests: initialGuests });
  const [loading, setLoading] = useState(false);
  const [excelStatus, setExcelStatus] = useState({ connected: false, error: '' });
  const [dashboardError, setDashboardError] = useState('');
  const [editingGuest, setEditingGuest] = useState(null);
  const [paletteId, setPaletteId] = useState('rose');
  const [paletteStatus, setPaletteStatus] = useState('');
  const refresh = useCallback(async () => { setLoading(true); setDashboardError(''); try { const accessToken = isDemoMode ? undefined : await getMicrosoftAccessToken(); const dashboard = await loadDashboard(accessToken); setData(current => ({ ...dashboard, rsvps: mergeRsvps(current.rsvps, dashboard.rsvps) })); } catch (error) { setDashboardError(error.message || 'Não foi possível carregar os dados compartilhados. A lista-base continua disponível.'); } finally { setLoading(false); } }, []);
  const syncExcel = useCallback(async () => { setLoading(true); setExcelStatus({ connected: false, error: '' }); try { const rsvps = await loadExcelRsvps(); setData(current => ({ ...current, rsvps: mergeRsvps(rsvps, current.rsvps.filter(item => item.source === 'site')) })); setExcelStatus({ connected: true, error: '' }); } catch (error) { setExcelStatus({ connected: false, error: error.message || 'Falha ao conectar ao Excel.' }); } finally { setLoading(false); } }, []);
  useEffect(() => {
    if (!authenticated) return undefined;
    let active = true;
    const initializeDashboard = async () => {
      await refresh();
      if (active) await syncExcel();
    };
    initializeDashboard();
    return () => { active = false; };
  }, [authenticated, refresh, syncExcel]);
  useEffect(() => { if (!authenticated || !excelStatus.connected) return undefined; const timer = window.setInterval(syncExcel, 30 * 60 * 1000); return () => window.clearInterval(timer); }, [authenticated, excelStatus.connected, syncExcel]);
  useEffect(() => { if (authenticated) loadSiteSettings().then(settings => setPaletteId(settings.palette || 'rose')).catch(() => {}); }, [authenticated]);

  const token = () => isDemoMode ? undefined : getMicrosoftAccessToken();
  const createGuest = async event => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const record = await addGuest(values, await token()); setData(current => ({ ...current, guests: [record, ...current.guests] })); form.reset(); };
  const removeGuest = async guest => { if (!window.confirm(`Excluir ${guest.name} da lista?`)) return; await deleteGuest(guest.id, await token()); setData(current => ({ ...current, guests: current.guests.filter(item => item.id !== guest.id) })); };
  const toggleGuest = async guest => { const confirmed = !guest.confirmed; const optimistic = { ...guest, confirmed, confirmedAt: confirmed ? new Date().toISOString() : '' }; setData(current => ({ ...current, guests: current.guests.map(item => item.id === guest.id ? optimistic : item) })); try { const record = await updateGuest(optimistic, await token()); setData(current => ({ ...current, guests: current.guests.map(item => item.id === record.id ? { ...item, ...record } : item) })); } catch (error) { setData(current => ({ ...current, guests: current.guests.map(item => item.id === guest.id ? guest : item) })); setDashboardError(error.message || 'Não foi possível salvar a confirmação.'); } };
  const saveGuest = async event => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const record = await updateGuest({ ...editingGuest, ...values }, await token()); setData(current => ({ ...current, guests: current.guests.map(item => item.id === record.id ? { ...item, ...record } : item) })); setEditingGuest(null); };
  const releaseGift = async gift => {
    if (!window.confirm(`Excluir a cota de “${gift.giftName}” informada por ${gift.name}?`)) return;
    try { await deleteGift(gift.id, await token()); setData(current => ({ ...current, gifts: current.gifts.filter(item => item.id !== gift.id) })); }
    catch (error) { setDashboardError(error.message || 'Não foi possível liberar o presente.'); }
  };
  const selectPalette = async id => {
    setPaletteId(id); setPaletteStatus('Salvando...');
    try { await saveSiteSettings({ palette: id }, await token()); setPaletteStatus('Paleta aplicada no site.'); }
    catch (error) { setPaletteStatus(error.message || 'Não foi possível salvar a paleta.'); }
  };
  const totals = useMemo(() => { const yes = data.rsvps.filter(item => item.attending === 'sim'); return { answers: data.rsvps.length, confirmed: yes.reduce((sum, item) => sum + Number(item.adults || 1) + Number(item.children || 0), 0), declined: data.rsvps.filter(item => item.attending === 'nao').length, giftValue: data.gifts.reduce((sum, item) => sum + Number(item.value || 0), 0) }; }, [data]);
  const groomGuests = data.guests.filter(guest => guest.side === 'Noivo');
  const brideGuests = data.guests.filter(guest => guest.side === 'Noiva');
  const sharedGuests = data.guests.filter(guest => guest.side === 'Ambos');
  const confirmedResponses = data.rsvps.filter(item => item.attending === 'sim');
  const alphabeticalConfirmed = [...confirmedResponses].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
  const confirmedPeople = confirmedResponses.reduce((sum, item) => sum + Number(item.adults || 0) + Number(item.children || 0), 0);
  if (!authenticated) return <Login onLogin={() => { sessionStorage.setItem('wedding-admin', '1'); setAuthenticated(true); }} />;

  return <div className="admin-shell"><aside><div className="admin-brand"><Heart /> <span>Painel<br /><strong>dos noivos</strong></span></div><Link to="/"><ArrowLeft /> Ver site</Link><Link to="/admin/presentes"><Gift /> Presentes</Link><button onClick={() => { sessionStorage.removeItem('wedding-admin'); setAuthenticated(false); }}>Sair</button></aside><main>
    <header><div><p className="eyebrow">Visão geral</p><h1>Gestão do casamento</h1></div><div className="admin-header-actions"><button className="button excel-button" onClick={syncExcel} disabled={loading}><Cloud className={loading ? 'spin' : ''} /> {excelStatus.connected ? 'Sincronizado' : 'Conectar Excel'}</button><button className="button outline" onClick={async () => { await refresh(); await syncExcel(); }} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /> Atualizar dados</button></div></header>
    {dashboardError && <div className="excel-banner error">{dashboardError}</div>}{excelStatus.error && <div className="excel-banner error">{excelStatus.error}</div>}{isDemoMode && !excelStatus.connected && <div className="demo-banner">Conecte sua conta Microsoft para carregar as confirmações da aba Form1. Presentes e recados ainda estão no modo local.</div>}
    <div className="stat-grid"><article><Users /><span>Convidados confirmados</span><strong>{totals.confirmed}</strong></article><article><CheckCircle2 /><span>Respostas recebidas</span><strong>{totals.answers}</strong></article><article><XCircle /><span>Não poderão ir</span><strong>{totals.declined}</strong></article><article><Gift /><span>Cotas recebidas</span><strong>{data.gifts.length}</strong><small>R$ {totals.giftValue.toLocaleString('pt-BR')}</small></article></div>
    <section className="admin-panel palette-manager"><div><Palette /><div><h2>Paleta do site</h2><p>Escolha as cores exibidas para todos os visitantes.</p></div></div><div className="admin-palette-options">{colorPalettes.map(item => <button type="button" key={item.id} className={paletteId === item.id ? 'selected' : ''} onClick={() => selectPalette(item.id)} aria-pressed={paletteId === item.id}><span className="color-pair"><i style={{ background: item.primary }} /><i style={{ background: item.accent }} /></span><span>{item.name}</span>{paletteId === item.id && <Check size={14} />}</button>)}</div>{paletteStatus && <small role="status">{paletteStatus}</small>}</section>
    <section className="admin-panel guest-manager"><div className="panel-heading"><div><h2>Lista de convidados</h2><span>{data.guests.length} pessoas cadastradas · marque quem já confirmou</span></div><form className="guest-form" onSubmit={createGuest}><input required name="name" placeholder="Nome do convidado" /><select name="side" defaultValue="Noivo"><option>Noivo</option><option>Noiva</option><option>Ambos</option></select><button className="button primary"><Plus size={17} /> Adicionar</button></form></div><div className="guest-split"><GuestColumn title="Convidados do noivo" label="Allyson · confirmados/total" guests={groomGuests} onToggle={toggleGuest} onEdit={setEditingGuest} onRemove={removeGuest} /><GuestColumn title="Convidados da noiva" label="Mayara · confirmados/total" guests={brideGuests} onToggle={toggleGuest} onEdit={setEditingGuest} onRemove={removeGuest} /></div>{sharedGuests.length > 0 && <GuestColumn title="Convidados dos dois" label="Lista compartilhada · confirmados/total" guests={sharedGuests} onToggle={toggleGuest} onEdit={setEditingGuest} onRemove={removeGuest} />}</section>
    <section className="admin-panel confirmations-panel"><div className="print-heading"><p>Lista de entrada</p><h1>Allyson & Mayara</h1><span>31 de outubro de 2026 · Quiosque Império</span><strong>{confirmedResponses.length} confirmações · {confirmedPeople} pessoas</strong></div><div className="confirmations-heading"><div><h2>Confirmações recebidas</h2><p>Veja quem respondeu e todos os acompanhantes informados.</p></div><div className="confirmation-actions"><button className="button outline print-button" onClick={() => window.print()} disabled={!confirmedResponses.length}><Printer size={16} /> Imprimir lista</button><strong>{data.rsvps.length}</strong></div></div><div className="confirmation-list screen-confirmation-list">{data.rsvps.map(item => <ConfirmationCard item={item} key={item.id} />)}{!data.rsvps.length && <p className="empty">Nenhuma resposta recebida. Clique em “Conectar Excel” para sincronizar.</p>}</div><div className="confirmation-list print-confirmation-list">{alphabeticalConfirmed.map(item => <ConfirmationCard item={item} key={`print-${item.id}`} />)}</div></section>
    <div className="admin-columns"><section className="admin-panel"><div className="feed-heading"><div><h2>Cotas informadas</h2><p>Contribuições registradas após a pessoa selecionar “Já fiz o PIX”.</p></div><div className="feed-total"><strong>{data.gifts.length}</strong><span>R$ {totals.giftValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div></div>{data.gifts.map(item => <article className="feed-item" key={item.id}><Gift /><div><strong>{item.giftName}</strong><span>{item.name} · R$ {Number(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>{item.message && <p>“{item.message}”</p>}<small>{formatDate(item.createdAt)}</small></div><button type="button" className="feed-delete" onClick={() => releaseGift(item)} aria-label={`Excluir cota de ${item.giftName}`} title="Excluir cota"><Trash2 size={16} /><span>Excluir</span></button></article>)}{!data.gifts.length && <p className="empty">Nenhuma cota informada.</p>}</section><section className="admin-panel"><div className="feed-heading"><div><h2>Recados</h2><p>Mensagens enviadas pelo formulário do site.</p></div><div className="feed-total"><strong>{data.messages.length}</strong><span>mensagens</span></div></div>{data.messages.map(item => <article className="feed-item" key={item.id}><Heart /><div><strong>{item.name}</strong><span>{item.message}</span><small>{formatDate(item.createdAt)}</small></div></article>)}{!data.messages.length && <p className="empty">Nenhum recado recebido.</p>}</section></div>
    {editingGuest && <div className="admin-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setEditingGuest(null)}><form className="admin-edit-modal" onSubmit={saveGuest}><p className="eyebrow">Editar convidado</p><h2>Dados da lista</h2><label>Nome<input required name="name" defaultValue={editingGuest.name} autoFocus /></label><label>Lista<select name="side" defaultValue={editingGuest.side}><option>Noivo</option><option>Noiva</option><option>Ambos</option></select></label><div><button type="button" className="button outline" onClick={() => setEditingGuest(null)}>Cancelar</button><button className="button primary">Salvar alterações</button></div></form></div>}
  </main></div>;
}
