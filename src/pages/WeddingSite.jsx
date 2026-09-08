import { useEffect, useState } from 'react';
import { CalendarDays, Check, ChevronDown, Gift, MapPin, Menu, Send, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { colorPalettes, gifts, pix, wedding } from '../config.js';
import { isDemoMode, loadGiftCatalog, loadSiteSettings, submitGift, submitMessage, submitRsvp } from '../services/weddingApi.js';
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
const confetti = Array.from({ length: 46 }, (_, index) => ({
  id: index,
  left: (index * 47 + 9) % 100,
  delay: (index % 12) * 0.045,
  duration: 1.8 + (index % 7) * 0.12,
  drift: -90 + (index % 10) * 20,
  rotation: 180 + (index % 8) * 75,
}));

function ConfirmationCelebration({ onClose }) {
  return <div className="confirmation-celebration" role="status" aria-live="polite">
    <div className="confetti-layer" aria-hidden="true">{confetti.map(piece => <i key={piece.id} style={{ '--confetti-left': `${piece.left}%`, '--confetti-delay': `${piece.delay}s`, '--confetti-duration': `${piece.duration}s`, '--confetti-drift': `${piece.drift}px`, '--confetti-rotation': `${piece.rotation}deg` }} />)}</div>
    <div className="celebration-card"><span className="celebration-icon"><Check /></span><p className="eyebrow">Presença confirmada</p><h2>Que alegria ter você conosco!</h2><p>Sua resposta foi registrada. Nos vemos no nosso grande dia!</p><button type="button" className="button primary" onClick={onClose}>Continuar</button></div>
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
  const [celebrating, setCelebrating] = useState(false);
  const [attending, setAttending] = useState('sim');
  const [adults, setAdults] = useState(1);
  const updateCompanions = event => {
    const companionCount = event.currentTarget.value.split('\n').filter(name => name.trim()).length;
    setAdults(Math.min(10, 1 + companionCount));
  };
  useEffect(() => {
    if (!celebrating) return undefined;
    const timer = window.setTimeout(() => setCelebrating(false), 5200);
    return () => window.clearTimeout(timer);
  }, [celebrating]);
  const onSubmit = async (event) => {
    event.preventDefault(); setStatus('loading');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await submitRsvp(Object.fromEntries(form));
      const confirmed = attending === 'sim';
      formElement.reset(); setAttending('sim'); setAdults(1); setStatus('success'); setCelebrating(confirmed);
    } catch (error) { setStatus(error.message || 'Não foi possível enviar. Tente novamente.'); }
  };
  return <><form className="form-card" onSubmit={onSubmit}>
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
    <label>WhatsApp<input required name="phone" inputMode="tel" autoComplete="tel" placeholder="(13) 99999-9999" /><small className="field-help">Usaremos o número para manter apenas sua resposta mais recente.</small></label>
    <label>Observações<textarea name="notes" /></label>
    <button className="button primary" disabled={status === 'loading'}>{status === 'loading' ? 'Enviando...' : 'Confirmar resposta'} <Check size={18} /></button>
    {status === 'success' && !celebrating && <p className="form-success" role="status">Resposta registrada com carinho. Obrigado! Se responder novamente com o mesmo WhatsApp, manteremos a resposta mais recente.</p>}
    {status && !['loading', 'success'].includes(status) && <p className="form-error" role="alert">{status}</p>}
  </form>{celebrating && <ConfirmationCelebration onClose={() => setCelebrating(false)} />}</>;
}

export default function WeddingSite() {
  const [menu, setMenu] = useState(false);
  const [gift, setGift] = useState(null);
  const [customGiftOpen, setCustomGiftOpen] = useState(false);
  const [giftPage, setGiftPage] = useState(1);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [giftCatalog, setGiftCatalog] = useState(gifts);
  const [giftAmount, setGiftAmount] = useState(0);
  const [giftReference, setGiftReference] = useState('');
  const [paletteId, setPaletteId] = useState('rose');
  const palette = colorPalettes.find(item => item.id === paletteId) || colorPalettes[0];
  const paletteStyle = { '--green': palette.primary, '--gold': palette.accent, '--cream': palette.cream, '--soft': palette.soft, '--ink': palette.ink };
  const giftsPerPage = 10;
  const giftPageCount = Math.max(1, Math.ceil(giftCatalog.length / giftsPerPage));
  const visibleGifts = giftCatalog.slice((giftPage - 1) * giftsPerPage, giftPage * giftsPerPage);
  const changeGiftPage = page => {
    setGiftPage(page);
    window.setTimeout(() => document.getElementById('presentes')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };
  const pixPayload = gift && giftAmount > 0 ? createPixPayload({ ...pix, amount: giftAmount, reference: giftReference || gift.id }) : '';
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    Promise.all([loadSiteSettings(), loadGiftCatalog(gifts)]).then(([settings, catalog]) => {
      setPaletteId(settings.palette || 'rose');
      setGiftCatalog(catalog);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    const modalOpen = Boolean(gift || customGiftOpen || menu);
    document.body.classList.toggle('overlay-open', modalOpen);
    const close = event => {
      if (event.key !== 'Escape') return;
      setGift(null); setCustomGiftOpen(false); setMenu(false);
    };
    document.addEventListener('keydown', close);
    return () => { document.body.classList.remove('overlay-open'); document.removeEventListener('keydown', close); };
  }, [gift, customGiftOpen, menu]);
  const nav = [['Home','home'],['Cerimônia','cerimonia'],['Lista de presentes','presentes'],['Confirme sua presença','confirmacao'],['Recados','recados']];
  const heroPhotoStyle = wedding.photos.hero ? { backgroundImage: `linear-gradient(180deg,rgba(31,39,32,.2),rgba(31,39,32,.58)),url(${wedding.photos.hero})` } : {};
  const chooseGift = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    setBusy('gift');
    try {
      const value = Number(payload.value);
      if (!Number.isFinite(value) || value <= 0) throw new Error('Informe um valor válido para a cota.');
      await submitGift({ ...payload, giftId: gift.id, giftName: gift.name, value });
      setGift(null); setNotice('Sua cota foi registrada com sucesso. Obrigado pelo carinho!');
    } catch (error) {
      setNotice(error.message || 'Não foi possível registrar a cota. Tente novamente.');
    } finally { setBusy(''); }
  };
  const createCustomGift = event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const price = Number(values.price);
    if (!values.name?.trim() || !Number.isFinite(price) || price <= 0) return;
    const id = `custom-${Date.now()}`;
    setGift({ id, name: values.name.trim(), price, emoji: '🎁', custom: true }); setGiftAmount(price); setGiftReference(id);
    setCustomGiftOpen(false);
  };
  const leaveMessage = async (event) => {
    event.preventDefault(); const formElement = event.currentTarget;
    setBusy('message');
    try {
      await submitMessage(Object.fromEntries(new FormData(formElement)));
      formElement.reset(); setNotice('Seu recado foi enviado. Obrigado pelo carinho!');
    } catch (error) { setNotice(error.message || 'Não foi possível enviar o recado. Tente novamente.'); }
    finally { setBusy(''); }
  };
  return <div className="site-shell" style={paletteStyle}>
    <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
    <header className="topbar"><a className="monogram" href="#home">{wedding.initials}</a><nav id="site-navigation" className={menu ? 'open' : ''}>{nav.map(([label,id]) => <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>{label}</a>)}</nav><button type="button" className="menu-button" onClick={() => setMenu(!menu)} aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} aria-controls="site-navigation">{menu ? <X /> : <Menu />}</button></header>
    <main id="main-content">
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
      <section id="presentes" className="section gifts-section"><p className="eyebrow">Um gesto de carinho</p><div className="gifts-heading"><div><h2>Lista de presentes</h2><p className="section-lead">Sua presença é o maior presente. Mas, se desejar nos presentear, escolha um presente e defina o valor da sua cota.</p></div><button type="button" className="button create-gift-button" onClick={() => setCustomGiftOpen(true)}><Gift size={19} /> Crie seu Presente</button></div><div className="gift-grid">{visibleGifts.map(item => <article className="gift-card" key={item.id}><div className="gift-art gift-figure" role="img" aria-label={item.name}>{item.image ? <img src={item.image} alt="" /> : item.emoji}</div><div><h3>{item.name}</h3><strong>Sugestão: {money.format(item.price)}</strong><button type="button" className="text-button" onClick={() => { setGift(item); setGiftAmount(item.price); setGiftReference(`${item.id}-${Date.now().toString().slice(-7)}`); }}>Presentear <Gift size={16} /></button></div></article>)}</div><nav className="gift-pagination" aria-label="Páginas da lista de presentes"><button type="button" aria-label="Página anterior" disabled={giftPage === 1} onClick={() => changeGiftPage(giftPage - 1)}>Anterior</button>{Array.from({ length: giftPageCount }, (_, index) => index + 1).map(page => <button type="button" key={page} className={page === giftPage ? 'active' : ''} aria-current={page === giftPage ? 'page' : undefined} onClick={() => changeGiftPage(page)}>{page}</button>)}<button type="button" aria-label="Próxima página" disabled={giftPage === giftPageCount} onClick={() => changeGiftPage(giftPage + 1)}>Próxima</button></nav></section>
      <section id="confirmacao" className="section rsvp"><div><p className="eyebrow">Esperamos por você</p><h2>Confirme sua presença</h2><p>Para prepararmos tudo com muito cuidado, sua confirmação será registrada diretamente em nossa lista.</p><p className="rsvp-deadline"><CalendarDays size={18} /><span>Confirme sua presença até <strong>20/10/2026</strong></span></p></div><RsvpForm /></section>
      <section id="recados" className="section messages"><p className="eyebrow">Palavras que ficam</p><h2>Deixe um recado</h2><form className="message-form" onSubmit={leaveMessage}><label className="sr-only" htmlFor="message-name">Seu nome</label><input id="message-name" required name="name" autoComplete="name" placeholder="Seu nome" /><label className="sr-only" htmlFor="message-text">Mensagem para os noivos</label><textarea id="message-text" required name="message" placeholder="Escreva sua mensagem para os noivos" /><button className="button primary" disabled={busy === 'message'}>{busy === 'message' ? 'Enviando recado...' : 'Enviar recado'} <Send size={17} /></button></form></section>
    </main>
    <footer><span>{wedding.initials}</span><p>Feito com amor para celebrar esse dia.</p><a href="#/admin">Área dos noivos</a>{isDemoMode && <small>Modo demonstração</small>}<small className="developer-credit">Desenvolvido por Allyson Bastos</small></footer>
    {gift && <div className="modal-backdrop" onMouseDown={() => setGift(null)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="gift-modal-title" onMouseDown={e => e.stopPropagation()}><button type="button" className="modal-close" onClick={() => setGift(null)} aria-label="Fechar janela do presente"><X /></button><span className="modal-gift-figure">{gift.image ? <img src={gift.image} alt="" /> : gift.emoji}</span><p className="eyebrow">Você escolheu</p><h2 id="gift-modal-title">{gift.name}</h2><form className="quota-form" onSubmit={chooseGift}><label>Valor da sua cota *<div className="money-input"><span>R$</span><input required name="value" type="number" min="1" step="0.01" inputMode="decimal" value={giftAmount} onChange={event => setGiftAmount(Number(event.target.value))} /></div></label>{giftAmount > 0 && <div className="pix-box"><QRCodeSVG value={pixPayload} size={210} level="M" aria-label={`QR Code PIX no valor de ${money.format(giftAmount)}`} /><strong>{money.format(giftAmount)}</strong><p>Abra o aplicativo do seu banco e escaneie o QR Code</p><button type="button" className="text-button" onClick={() => { navigator.clipboard.writeText(pixPayload); setNotice('Código PIX copiado!'); }}>Copiar código PIX</button></div>}<label>Nome de quem está presenteando *<input required name="name" autoComplete="name" autoFocus placeholder="Digite seu nome completo" /></label><label>Mensagem (opcional)<textarea name="message" placeholder="Uma mensagem para os noivos" /></label><button className="button primary" disabled={busy === 'gift'}>{busy === 'gift' ? 'Registrando cota...' : 'Já fiz o PIX'}</button></form><small>Você pode alterar o valor da cota. O QR Code será atualizado automaticamente com o valor escolhido.</small></div></div>}
    {customGiftOpen && <div className="modal-backdrop" onMouseDown={() => setCustomGiftOpen(false)}><div className="modal custom-gift-modal" role="dialog" aria-modal="true" aria-labelledby="custom-gift-title" onMouseDown={event => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setCustomGiftOpen(false)} aria-label="Fechar janela de presente personalizado"><X /></button><span className="modal-gift-figure">🎁</span><p className="eyebrow">Presente personalizado</p><h2 id="custom-gift-title">Crie seu presente</h2><p>Escolha como deseja nos presentear e informe o valor do seu carinho.</p><form onSubmit={createCustomGift}><label>Nome do presente *<input required name="name" maxLength="80" autoFocus placeholder="Ex.: Um jantar especial" /></label><label>Valor do presente *<div className="money-input"><span>R$</span><input required name="price" type="number" min="1" step="0.01" inputMode="decimal" placeholder="0,00" /></div></label><button className="button primary">Gerar PIX deste presente</button></form></div></div>}
    {notice && <div className="toast" role="status" aria-live="polite" onClick={() => setNotice('')}><Check /> {notice}</div>}
  </div>;
}
