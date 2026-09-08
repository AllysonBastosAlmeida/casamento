import { useEffect, useState } from 'react';
import { ArrowLeft, Heart, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { gifts } from '../config.js';
import { deleteGiftDefinition, isDemoMode, loadGiftCatalog, saveGiftDefinition } from '../services/weddingApi.js';
import { getMicrosoftAccessToken } from '../services/weddingExcel.js';
import { Login } from './WeddingAdmin.jsx';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const prepareImage = file => new Promise((resolve, reject) => {
  if (!file) { resolve(''); return; }
  if (!file.type.startsWith('image/')) { reject(new Error('Escolha um arquivo de imagem.')); return; }
  const image = new Image();
  const url = URL.createObjectURL(file);
  image.onload = () => {
    const scale = Math.min(1, 640 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    resolve(canvas.toDataURL('image/jpeg', .72));
  };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler esta imagem.')); };
  image.src = url;
});

export default function WeddingGiftAdmin() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('wedding-admin') === '1');
  const [catalog, setCatalog] = useState([]);
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const token = () => isDemoMode ? undefined : getMicrosoftAccessToken();
  const refresh = () => loadGiftCatalog(gifts).then(setCatalog).catch(error => setStatus(error.message));
  useEffect(() => { if (authenticated) refresh(); }, [authenticated]);

  const save = async event => {
    event.preventDefault(); setSaving(true); setStatus('');
    try {
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form));
      const file = form.elements.image.files[0];
      const image = file ? await prepareImage(file) : editing?.image || '';
      const item = await saveGiftDefinition({ id: editing?.id || `gift-custom-${Date.now()}`, name: values.name.trim(), price: Number(values.price), emoji: values.emoji || '🎁', image }, await token());
      setCatalog(current => [...current.filter(entry => entry.id !== item.id), item]);
      setEditing(null); setStatus('Presente salvo e publicado no site.');
    } catch (error) { setStatus(error.message || 'Não foi possível salvar o presente.'); }
    finally { setSaving(false); }
  };
  const remove = async item => {
    if (!window.confirm(`Excluir “${item.name}” da lista de presentes?`)) return;
    try { await deleteGiftDefinition(item.id, await token()); setCatalog(current => current.filter(entry => entry.id !== item.id)); setStatus('Presente removido do site.'); }
    catch (error) { setStatus(error.message || 'Não foi possível excluir o presente.'); }
  };
  if (!authenticated) return <Login onLogin={() => { sessionStorage.setItem('wedding-admin', '1'); setAuthenticated(true); }} />;

  return <div className="admin-shell gift-admin"><aside><div className="admin-brand"><Heart /> <span>Painel<br /><strong>dos noivos</strong></span></div><Link to="/admin"><ArrowLeft /> Visão geral</Link><Link to="/"><ArrowLeft /> Ver site</Link><button onClick={() => { sessionStorage.removeItem('wedding-admin'); setAuthenticated(false); }}>Sair</button></aside><main>
    <header><div><p className="eyebrow">Lista de presentes</p><h1>Gerenciar presentes</h1></div><button className="button primary" onClick={() => setEditing({})}><Plus /> Novo presente</button></header>
    {status && <div className="excel-banner success" role="status">{status}</div>}
    <section className="admin-panel gift-catalog-panel"><div className="gift-admin-heading"><div><h2>Presentes publicados</h2><p>Edite o nome, o valor sugerido e a imagem que aparece para os convidados.</p></div><strong>{catalog.length}</strong></div>
      <div className="gift-admin-grid">{catalog.map(item => <article key={item.id}><div className="gift-admin-image">{item.image ? <img src={item.image} alt={item.name} /> : <span>{item.emoji || '🎁'}</span>}</div><div><h3>{item.name}</h3><strong>{money.format(item.price)}</strong><div><button type="button" onClick={() => setEditing(item)}><Pencil /> Editar</button><button type="button" className="danger" onClick={() => remove(item)}><Trash2 /> Excluir</button></div></div></article>)}</div>
    </section>
    {editing && <div className="admin-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setEditing(null)}><form className="admin-edit-modal gift-edit-modal" onSubmit={save}><button type="button" className="gift-edit-close" onClick={() => setEditing(null)} aria-label="Fechar"><X /></button><p className="eyebrow">{editing.id ? 'Editar presente' : 'Novo presente'}</p><h2>Dados do presente</h2><label>Nome<input required name="name" defaultValue={editing.name || ''} autoFocus /></label><label>Valor sugerido<input required name="price" type="number" min="1" step="0.01" inputMode="decimal" defaultValue={editing.price || ''} /></label><label>Imagem<input name="image" type="file" accept="image/*" /><small>A imagem será otimizada automaticamente.</small></label><label>Emoji alternativo<input name="emoji" maxLength="12" defaultValue={editing.emoji || '🎁'} /></label>{editing.image && <img className="gift-edit-preview" src={editing.image} alt="Imagem atual" />}<div><button type="button" className="button outline" onClick={() => setEditing(null)}>Cancelar</button><button className="button primary" disabled={saving}><ImagePlus /> {saving ? 'Salvando...' : 'Salvar presente'}</button></div></form></div>}
  </main></div>;
}
