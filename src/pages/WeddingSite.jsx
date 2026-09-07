import { useEffect, useState } from 'react';
import { CalendarDays, Check, ChevronDown, Gift, MapPin, Menu, Palette, Send, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { colorPalettes, gifts, pix, wedding } from '../config.js';
import { isDemoMode, submitGift, submitMessage, submitRsvp } from '../services/weddingApi.js';
import { createPixPayload } from '../utils/pix.js';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const petals = Array.from({ length: 20 }, (_, index) => ({
  id: index,
  left: (index * 37 + 7) % 100,
  delay: -((index * 1.7) % 14),
  duration: 10 + (index % 6) * 1.8,
  size: 8 + (index % 5) * 2,
  drift: -45 + (index % 7) * 15,
}));

function PalettePicker({ selected, onSelect }) {
  const [open, setOpen] = useState(false);
  return <div className={`palette-picker ${open ? 'open' : ''}`}>
    <button className="palette-toggle" onClick={() => setOpen(value => !value)} aria-label="Escolher paleta de cores"><Palette size={21} /><span>Cores</span></button>
    <div className="palette-panel"><div className="palette-title"><div><strong>Paleta do casamento</strong><span>Escolha uma combinação</span></div><button onClick={() => setOpen(false)} aria-label="Fechar"><X size={18} /></button></div>
      <div className="palette-options">{colorPalettes.map(item => <button key={item.id} className={selected === item.id ? 'selected' : ''} onClick={() => onSelect(item.id)} title={item.name}><span className="color-pair"><i style={{ background: item.primary }} /><i style={{ background: item.accent }} /></span><span>{item.name}</span>{selected === item.id && <Check size={14} />}</button>)}</div>
    </div>
  </div>;
}

function Countdown() {
  const calculate = () => Math.max(0, new Date(wedding.date).getTime() - Date.now());
  const [distance, setDistance] = useState(calculate);
  useEffect(() => {
    const timer = window.setInterval(() => setDistance(calculate()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const units = [
    ['dias', Math.floor(distance / 86400000)],
    ['horas', Math.floor((distance / 3600000) % 24)],
    ['min', Math.floor((distance / 60000) % 60)],
    ['seg', Math.floor((distance / 1000) % 60)],
  ];
  return <div className="countdown">{units.map(([label, value]) => <div key={label}><strong>{String(value).padStart(2, '0')}</strong><span>{label}</span></div>)}</div>;
}

function FloralCorner({ className }) {
  return <svg className={`ceremony-floral ${className}`} viewBox="0 0 180 180" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path className="floral-stem" d="M15 166C41 130 47 91 80 54C99 33 124 20 160 13" />
      <path d="M37 134C20 130 13 118 12 103C27 105 38 116 37 134ZM49 112C62 101 76 100 88 107C77 120 64 124 49 112ZM59 84C45 78 38 66 39 52C53 55 62 67 59 84ZM79 57C91 45 105 42 118 48C108 61 95 66 79 57ZM108 35C102 23 105 12 115 4C123 16 121 27 108 35ZM127 25C140 22 151 27 158 38C144 42 133 38 127 25Z" />
      <path d="M26 151C19 142 9 140 2 144C7 154 15 158 26 151ZM68 71C71 57 64 46 53 40C48 53 54 65 68 71ZM94 44C88 34 89 24 97 16C105 25 104 35 94 44Z" />
      <circle cx="82" cy="93" r="4" /><circle cx="122" cy="31" r="3" /><circle cx="45" cy="124" r="3" />
    </g>
  </svg>;
}

function RsvpForm() {
  const [status, setStatus] = useState('');
  const [attending, setAttending] = useState('sim');
  const [adults, setAdults] = useState(1);
  const updateCompanions = event => {
    const companionCount = event.currentTarget.value.split('\n').filter(name => name.trim()).length;
    setAdults(Math.min(10, 1 + companionCount));
  };
  const onSubmit = async (event) => {
    event.preventDefault(); setStatus('loading');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await submitRsvp(Object.fromEntries(form));
      formElement.reset(); setAttending('sim'); setAdults(1); setStatus('success');
    } catch { setStatus('error'); }
  };
  return <form className="form-card" onSubmit={onSubmit}>
    <label>Nome completo<input required name="name" autoComplete="name" /></label>
    <fieldset><legend>Você estará conosco?</legend><div className="choice-row">
      <label><input type="radio" name="attending" value="sim" checked={attending === 'sim'} onChange={() => setAttending('sim')} /> Sim, estarei</label>
      <label><input type="radio" name="attending" value="nao" checked={attending === 'nao'} onChange={() => setAttending('nao')} /> Não poderei</label>
    </div></fieldset>
    {attending === 'sim' && <div className="form-grid">
      <label>Adultos<select name="adults" value={adults} onChange={event => setAdults(Number(event.target.value))}>{[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n}>{n}</option>)}</select><small className="field-help">Atualizado automaticamente pelos acompanhantes.</small></label>
      <label>Crianças acima de 5 anos<select name="children" defaultValue="0">{[0,1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select><small className="field-help">Crianças de até 5 anos não precisam ser incluídas.</small></label>
    </div>}
    {attending === 'sim' && <label>Nomes dos acompanhantes<textarea name="companions" placeholder="Um nome por linha" onChange={updateCompanions} /></label>}
    {attending === 'sim' && <label>WhatsApp<input required name="phone" inputMode="tel" autoComplete="tel" placeholder="(13) 99999-9999" /></label>}
    <label>Observações<textarea name="notes" /></label>
    <button className="button primary" disabled={status === 'loading'}>{status === 'loading' ? 'Enviando...' : 'Confirmar resposta'} <Check size={18} /></button>
    {status === 'success' && <p className="form-success">Resposta registrada com carinho. Obrigado!</p>}
    {status === 'error' && <p className="form-error">Não foi possível enviar. Tente novamente.</p>}
  </form>;
}

export default function WeddingSite() {
  const [menu, setMenu] = useState(false);
  const [gift, setGift] = useState(null);
  const [customGiftOpen, setCustomGiftOpen] = useState(false);
  const [giftPage, setGiftPage] = useState(1);
  const [notice, setNotice] = useState('');
  const [paletteId, setPaletteId] = useState(() => localStorage.getItem('wedding-palette') || 'rose');
  const palette = colorPalettes.find(item => item.id === paletteId) || colorPalettes[0];
  const paletteStyle = { '--green': palette.primary, '--gold': palette.accent, '--cream': palette.cream, '--soft': palette.soft, '--ink': palette.ink };
  const selectPalette = id => { setPaletteId(id); localStorage.setItem('wedding-palette', id); };
  const giftsPerPage = 10;
  const giftPageCount = Math.ceil(gifts.length / giftsPerPage);
  const visibleGifts = gifts.slice((giftPage - 1) * giftsPerPage, giftPage * giftsPerPage);
  const changeGiftPage = page => {
    setGiftPage(page);
    window.setTimeout(() => document.getElementById('presentes')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };
  const pixPayload = gift ? createPixPayload({ ...pix, amount: gift.price, reference: gift.id }) : '';
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const nav = [['Home','home'],['Cerimônia','cerimonia'],['Lista de presentes','presentes'],['Confirme sua presença','confirmacao'],['Recados','recados']];
  const heroPhotoStyle = wedding.photos.hero ? { backgroundImage: `linear-gradient(180deg,rgba(31,39,32,.2),rgba(31,39,32,.58)),url(${wedding.photos.hero})` } : {};
  const chooseGift = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    await submitGift({ ...payload, giftId: gift.id, giftName: gift.name, value: gift.price });
    setGift(null); setNotice('Presente reservado! Em breve entraremos em contato com os dados para finalizar.');
  };
  const createCustomGift = event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const price = Number(values.price);
    if (!values.name?.trim() || !Number.isFinite(price) || price <= 0) return;
    setGift({ id: `custom-${Date.now()}`, name: values.name.trim(), price, emoji: '🎁', custom: true });
    setCustomGiftOpen(false);
  };
  const leaveMessage = async (event) => {
    event.preventDefault(); const formElement = event.currentTarget;
    await submitMessage(Object.fromEntries(new FormData(formElement)));
    formElement.reset(); setNotice('Seu recado foi enviado. Obrigado pelo carinho!');
  };
  return <div className="site-shell" style={paletteStyle}>
    <header className="topbar"><a className="monogram" href="#home">{wedding.initials}</a><nav className={menu ? 'open' : ''}>{nav.map(([label,id]) => <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>{label}</a>)}</nav><button className="menu-button" onClick={() => setMenu(!menu)} aria-label="Abrir menu">{menu ? <X /> : <Menu />}</button></header>
    <main>
      <section id="home" className={`hero ${wedding.photos.hero ? 'has-photo' : ''}`}>
        {wedding.photos.hero && <div className="hero-photo" style={heroPhotoStyle} />}
        {!wedding.photos.hero && <div className="hero-photo-note">Sua foto principal será inserida aqui</div>}
        <div className="petal-layer" aria-hidden="true">{petals.map(petal => <i key={petal.id} style={{ '--petal-left': `${petal.left}%`, '--petal-delay': `${petal.delay}s`, '--petal-duration': `${petal.duration}s`, '--petal-size': `${petal.size}px`, '--petal-drift': `${petal.drift}px`, '--petal-end': `${petal.drift * -0.6}px` }} />)}</div>
        <div className="hero-identity">
          <h1>{wedding.couple}</h1>
          <div className="hero-date">{new Date(wedding.date).toLocaleDateString('pt-BR').replaceAll('/', '  |  ')}</div>
        </div>
        <a className="scroll-cue" href="#boas-vindas"><ChevronDown /></a>
      </section>
      <section id="boas-vindas" className="section intro"><p className="eyebrow">Sejam bem-vindos</p><h2>O nosso grande dia está chegando</h2><p>Criamos este site para compartilhar cada detalhe desse momento tão especial. Esperamos celebrar o amor ao lado de vocês.</p><Countdown /></section>
      <section id="cerimonia" className="ceremony"><div className="ceremony-card"><FloralCorner className="floral-top" /><FloralCorner className="floral-bottom" /><CalendarDays /><p className="eyebrow">Reserve esta data</p><h2>Cerimônia & celebração</h2><strong>{wedding.dateLabel} · {wedding.timeLabel}</strong><p className="venue-details"><span className="venue-name">{wedding.venue}</span><span className="venue-address">{wedding.address}</span></p><a className="button light" href={wedding.mapUrl} target="_blank" rel="noreferrer"><MapPin size={18} /> Traçar rota</a></div><div className="ceremony-map"><iframe title={`Mapa — ${wedding.venue}`} src="https://www.google.com/maps?q=-24.0154444,-46.4027778&z=16&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div></section>
      <section id="presentes" className="section gifts-section"><p className="eyebrow">Um gesto de carinho</p><div className="gifts-heading"><div><h2>Lista de presentes</h2><p className="section-lead">Sua presença é o maior presente. Mas, se desejar nos presentear, preparamos algumas ideias.</p></div><button className="button create-gift-button" onClick={() => setCustomGiftOpen(true)}><Gift size={19} /> Crie seu Presente</button></div><div className="gift-grid">{visibleGifts.map(item => <article className="gift-card" key={item.id}><div className="gift-art gift-figure" role="img" aria-label={item.name}>{item.emoji}</div><div><h3>{item.name}</h3><strong>{money.format(item.price)}</strong><button className="text-button" onClick={() => setGift(item)}>Presentear <Gift size={16} /></button></div></article>)}</div><nav className="gift-pagination" aria-label="Páginas da lista de presentes"><button disabled={giftPage === 1} onClick={() => changeGiftPage(giftPage - 1)}>Anterior</button>{Array.from({ length: giftPageCount }, (_, index) => index + 1).map(page => <button key={page} className={page === giftPage ? 'active' : ''} aria-current={page === giftPage ? 'page' : undefined} onClick={() => changeGiftPage(page)}>{page}</button>)}<button disabled={giftPage === giftPageCount} onClick={() => changeGiftPage(giftPage + 1)}>Próxima</button></nav></section>
      <section id="confirmacao" className="section rsvp"><div><p className="eyebrow">Esperamos por você</p><h2>Confirme sua presença</h2><p>Para prepararmos tudo com muito cuidado, sua confirmação será registrada diretamente em nossa lista.</p><p className="rsvp-deadline"><CalendarDays size={18} /><span>Confirme sua presença até <strong>20/10/2026</strong></span></p></div><RsvpForm /></section>
      <section id="recados" className="section messages"><p className="eyebrow">Palavras que ficam</p><h2>Deixe um recado</h2><form className="message-form" onSubmit={leaveMessage}><input required name="name" placeholder="Seu nome" /><textarea required name="message" placeholder="Escreva sua mensagem para os noivos" /><button className="button primary">Enviar recado <Send size={17} /></button></form></section>
    </main>
    <footer><span>{wedding.initials}</span><p>Feito com amor para celebrar esse dia.</p><a href="#/admin">Área dos noivos</a>{isDemoMode && <small>Modo demonstração</small>}</footer>
    {gift && <div className="modal-backdrop" onMouseDown={() => setGift(null)}><div className="modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setGift(null)}><X /></button><span className="modal-gift-figure">{gift.emoji}</span><p className="eyebrow">Você escolheu</p><h2>{gift.name}</h2><strong>{money.format(gift.price)}</strong><div className="pix-box"><QRCodeSVG value={pixPayload} size={210} level="M" /><p>Abra o aplicativo do seu banco e escaneie o QR Code</p><button type="button" className="text-button" onClick={() => { navigator.clipboard.writeText(pixPayload); setNotice('Código PIX copiado!'); }}>Copiar código PIX</button></div><form onSubmit={chooseGift}><label>Nome de quem está presenteando *<input required name="name" placeholder="Digite seu nome completo" /></label><label>Mensagem (opcional)<textarea name="message" placeholder="Uma mensagem para os noivos" /></label><button className="button primary">Já fiz o PIX</button></form><small>O valor e a identificação deste presente já estão preenchidos no QR Code.</small></div></div>}
    {customGiftOpen && <div className="modal-backdrop" onMouseDown={() => setCustomGiftOpen(false)}><div className="modal custom-gift-modal" onMouseDown={event => event.stopPropagation()}><button className="modal-close" onClick={() => setCustomGiftOpen(false)}><X /></button><span className="modal-gift-figure">🎁</span><p className="eyebrow">Presente personalizado</p><h2>Crie seu presente</h2><p>Escolha como deseja nos presentear e informe o valor do seu carinho.</p><form onSubmit={createCustomGift}><label>Nome do presente *<input required name="name" maxLength="80" placeholder="Ex.: Um jantar especial" /></label><label>Valor do presente *<div className="money-input"><span>R$</span><input required name="price" type="number" min="1" step="0.01" inputMode="decimal" placeholder="0,00" /></div></label><button className="button primary">Gerar PIX deste presente</button></form></div></div>}
    {notice && <div className="toast" onClick={() => setNotice('')}><Check /> {notice}</div>}
    <PalettePicker selected={paletteId} onSelect={selectPalette} />
  </div>;
}
