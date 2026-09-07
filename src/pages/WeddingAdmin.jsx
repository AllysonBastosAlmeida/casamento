import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Cloud, Gift, Heart, LockKeyhole, Plus, RefreshCw, Trash2, Users, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { addGuest, deleteGuest, isDemoMode, loadDashboard } from '../services/weddingApi.js';
import { hasMicrosoftSession, loadExcelRsvps } from '../services/weddingExcel.js';

const date = value => {
  if (!value) return '—';
  const brazilian = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (brazilian) {
    const [, day, month, year, hour = '0', minute = '0'] = brazilian;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).toLocaleString('pt-BR');
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString('pt-BR');
};

function Login({ onLogin }) {
  const [error, setError] = useState(false);
  const submit = event => { event.preventDefault(); const pin = new FormData(event.currentTarget).get('pin'); if (pin === (import.meta.env.VITE_ADMIN_PIN || 'casamento2027')) onLogin(); else setError(true); };
  return <main className="admin-login"><form onSubmit={submit}><LockKeyhole /><p className="eyebrow">Área reservada</p><h1>Painel dos noivos</h1><p>Acesse para acompanhar confirmações, presentes e recados.</p><input name="pin" type="password" placeholder="PIN de acesso" autoFocus /><button className="button primary">Entrar</button>{error && <p className="form-error">PIN incorreto.</p>}<Link to="/"><ArrowLeft size={16} /> Voltar ao site</Link></form></main>;
}

function GuestColumn({ title, label, guests, onRemove }) {
  return <section className="guest-column"><header><div><span>{label}</span><h3>{title}</h3></div><strong>{guests.length}</strong></header><div className="compact-guest-list">{guests.map((guest, index) => <article key={guest.id}><span className="guest-number">{index + 1}</span><strong title={guest.name}>{guest.name}</strong><button onClick={() => onRemove(guest)} aria-label={`Excluir ${guest.name}`} title="Excluir convidado"><Trash2 size={15} /></button></article>)}{!guests.length && <p className="empty">Nenhum convidado nesta lista.</p>}</div></section>;
}

export default function WeddingAdmin() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('wedding-admin') === '1');
  const [data, setData] = useState({ rsvps: [], gifts: [], messages: [], guests: [] });
  const [loading, setLoading] = useState(false);
  const [excelStatus, setExcelStatus] = useState({ connected: false, error: '' });
  const refresh = useCallback(async () => { setLoading(true); try { setData(await loadDashboard()); } finally { setLoading(false); } }, []);
  const syncExcel = useCallback(async () => {
    setLoading(true); setExcelStatus({ connected: false, error: '' });
    try {
      const rsvps = await loadExcelRsvps();
      setData(current => ({ ...current, rsvps }));
      setExcelStatus({ connected: true, error: '' });
    } catch (error) {
      setExcelStatus({ connected: false, error: error.message || 'Falha ao conectar ao Excel.' });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (authenticated) refresh(); }, [authenticated, refresh]);
  useEffect(() => { if (authenticated) hasMicrosoftSession().then(connected => connected && syncExcel()).catch(() => {}); }, [authenticated, syncExcel]);
  useEffect(() => {
    if (!authenticated || !excelStatus.connected) return undefined;
    const timer = window.setInterval(syncExcel, 30000);
    return () => window.clearInterval(timer);
  }, [authenticated, excelStatus.connected, syncExcel]);
  const createGuest = async event => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const record = await addGuest(values); setData(current => ({ ...current, guests: [record, ...current.guests] })); form.reset(); };
  const removeGuest = async guest => { if (!window.confirm(`Excluir ${guest.name} da lista?`)) return; await deleteGuest(guest.id); setData(current => ({ ...current, guests: current.guests.filter(item => item.id !== guest.id) })); };
  const totals = useMemo(() => {
    const yes = data.rsvps.filter(item => item.attending === 'sim');
    return { answers: data.rsvps.length, confirmed: yes.reduce((sum, item) => sum + Number(item.adults || 1) + Number(item.children || 0), 0), declined: data.rsvps.filter(item => item.attending === 'nao').length, giftValue: data.gifts.reduce((sum, item) => sum + Number(item.value || 0), 0) };
  }, [data]);
  const groomGuests = data.guests.filter(guest => guest.side === 'Noivo');
  const brideGuests = data.guests.filter(guest => guest.side === 'Noiva');
  const sharedGuests = data.guests.filter(guest => guest.side === 'Ambos');
  if (!authenticated) return <Login onLogin={() => { sessionStorage.setItem('wedding-admin','1'); setAuthenticated(true); }} />;
  return <div className="admin-shell"><aside><div className="admin-brand"><Heart /> <span>Painel<br /><strong>dos noivos</strong></span></div><Link to="/"><ArrowLeft /> Ver site</Link><button onClick={() => { sessionStorage.removeItem('wedding-admin'); setAuthenticated(false); }}>Sair</button></aside><main><header><div><p className="eyebrow">Visão geral</p><h1>Gestão do casamento</h1></div><div className="admin-header-actions"><button className="button excel-button" onClick={syncExcel} disabled={loading}><Cloud className={loading ? 'spin' : ''} /> {excelStatus.connected ? 'Sincronizado' : 'Conectar Excel'}</button><button className="button outline" onClick={refresh} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /> Atualizar dados locais</button></div></header>{excelStatus.error && <div className="excel-banner error">{excelStatus.error}</div>}{excelStatus.connected && <div className="excel-banner success">Aba Form1 conectada. As confirmações abaixo vieram do Excel.</div>}{isDemoMode && !excelStatus.connected && <div className="demo-banner">Conecte sua conta Microsoft para carregar as confirmações da aba Form1. Presentes e recados ainda estão no modo local.</div>}<div className="stat-grid"><article><Users /><span>Convidados confirmados</span><strong>{totals.confirmed}</strong></article><article><CheckCircle2 /><span>Respostas recebidas</span><strong>{totals.answers}</strong></article><article><XCircle /><span>Não poderão ir</span><strong>{totals.declined}</strong></article><article><Gift /><span>Presentes reservados</span><strong>{data.gifts.length}</strong><small>R$ {totals.giftValue.toLocaleString('pt-BR')}</small></article></div>
  <section className="admin-panel guest-manager"><div className="panel-heading"><div><h2>Lista de convidados</h2><span>{data.guests.length} pessoas cadastradas no total</span></div><form className="guest-form" onSubmit={createGuest}><input required name="name" placeholder="Nome do convidado" /><select name="side" defaultValue="Noivo"><option>Noivo</option><option>Noiva</option><option>Ambos</option></select><button className="button primary"><Plus size={17} /> Adicionar</button></form></div><div className="guest-split"><GuestColumn title="Convidados do noivo" label="Allyson" guests={groomGuests} onRemove={removeGuest} /><GuestColumn title="Convidados da noiva" label="Mayara" guests={brideGuests} onRemove={removeGuest} /></div>{sharedGuests.length > 0 && <section className="shared-guests"><header><div><span>Lista compartilhada</span><h3>Convidados dos dois</h3></div><strong>{sharedGuests.length}</strong></header><div>{sharedGuests.map(guest => <article key={guest.id}><strong>{guest.name}</strong><button onClick={() => removeGuest(guest)} aria-label={`Excluir ${guest.name}`}><Trash2 size={15} /></button></article>)}</div></section>}</section>
  <section className="admin-panel"><h2>Confirmações</h2><div className="table-wrap"><table><thead><tr><th>Convidado</th><th>Resposta</th><th>Adultos</th><th>Crianças acima de 5</th><th>Contato</th><th>Data</th></tr></thead><tbody>{data.rsvps.map(item => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.companions}</small></td><td><span className={`badge ${item.attending}`}>{item.attending === 'sim' ? 'Confirmado' : 'Não irá'}</span></td><td>{item.adults || '—'}</td><td>{item.children || '0'}</td><td>{item.email}<small>{item.phone}</small></td><td>{date(item.createdAt)}</td></tr>)}{!data.rsvps.length && <tr><td colSpan="6" className="empty">Nenhuma resposta recebida.</td></tr>}</tbody></table></div></section>
  <div className="admin-columns"><section className="admin-panel"><h2>Presentes</h2>{data.gifts.map(item => <article className="feed-item" key={item.id}><Gift /><div><strong>{item.giftName}</strong><span>{item.name} · R$ {Number(item.value).toLocaleString('pt-BR')}</span></div></article>)}{!data.gifts.length && <p className="empty">Nenhum presente reservado.</p>}</section><section className="admin-panel"><h2>Recados</h2>{data.messages.map(item => <article className="feed-item" key={item.id}><Heart /><div><strong>{item.name}</strong><span>{item.message}</span></div></article>)}{!data.messages.length && <p className="empty">Nenhum recado recebido.</p>}</section></div></main></div>;
}
