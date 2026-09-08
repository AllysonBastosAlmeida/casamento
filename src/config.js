export const wedding = {
  couple: 'Allyson & Mayara',
  fullNames: 'Allyson Bastos Almeida & Mayara Barbosa Felipe',
  initials: 'A & M',
  date: '2026-10-31T08:00:00-03:00',
  dateLabel: '31 de outubro de 2026',
  timeLabel: '08h',
  venue: 'Quiosque Império',
  address: 'Av. Pres. Castelo Branco — Canto do Forte, Praia Grande — SP, 11702-200',
  mapUrl: 'https://www.google.com/maps/dir/?api=1&destination=-24.0154444%2C-46.4027778&destination_place_id=0x94ce1d0073e9df23%3A0x7ab19e6ef9d0821d',
  rsvpFormUrl: 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=mMuNT2lPW0W8lKHJo5gkCahteIMPHnhMiD6mzH1bcM5UNzE1TThGRjNYWExNVFZMT1o5V0NCTUVJNS4u&embed=true',
  whatsapp: '',
  photos: {
    hero: `${import.meta.env.BASE_URL}foto-capa.jpg`,
    ceremony: '',
  },
};

export const pix = {
  key: '453.633.528-50',
  receiver: 'MAYARA BARBOSA FELIPE',
  city: 'PRAIA GRANDE',
};

export const colorPalettes = [
  { id: 'rose', name: 'Branco & rosa claro', primary: '#9c6f79', accent: '#d7a9b2', cream: '#fffafa', soft: '#f7e9ec', ink: '#4b3c40' },
  { id: 'sage', name: 'Sálvia & marfim', primary: '#667463', accent: '#aaa17b', cream: '#faf8f1', soft: '#e8ece4', ink: '#374039' },
  { id: 'blue', name: 'Azul serenity', primary: '#617789', accent: '#a8bdcc', cream: '#fafcfd', soft: '#e7eef3', ink: '#35434d' },
  { id: 'lavender', name: 'Lavanda & pérola', primary: '#756b83', accent: '#b9a8c8', cream: '#fcfaff', soft: '#eee8f3', ink: '#443d4d' },
  { id: 'terracotta', name: 'Terracota & areia', primary: '#985f4b', accent: '#c99578', cream: '#fffaf5', soft: '#f2e3d7', ink: '#503b32' },
  { id: 'champagne', name: 'Champagne & dourado', primary: '#776851', accent: '#b89a64', cream: '#fffdf8', soft: '#eee7d9', ink: '#463f35' },
  { id: 'olive', name: 'Oliva & bege', primary: '#626348', accent: '#aaa176', cream: '#fbfaf4', soft: '#e9e7d8', ink: '#414234' },
  { id: 'burgundy', name: 'Marsala & rosé', primary: '#753d49', accent: '#c18e93', cream: '#fff9f9', soft: '#f1e1e3', ink: '#482c32' },
  { id: 'navy', name: 'Azul-marinho & prata', primary: '#34475d', accent: '#91a0ad', cream: '#fafbfd', soft: '#e5e9ed', ink: '#293541' },
  { id: 'classic', name: 'Preto & branco', primary: '#3e403e', accent: '#969a95', cream: '#ffffff', soft: '#eceeec', ink: '#242624' },
];

export const initialGuests = [
  'Mãe', 'Tuanny', 'Clara', 'Flor', 'Marcel', 'Deivid', 'Luciana', 'DH', 'Nicole', 'Rafa',
  'Daya', 'Rafa filha', 'Antonella', 'Pedro', 'Milena', 'Enzo', 'Karajana', 'Wellignton',
  'Leandro', 'Gerson', 'André Porcinia', 'Jessica', 'Luís alga', 'Geraldo', 'Marlon', 'Louise',
  'Marjorie', 'Wilson', 'Celso', 'Camila', 'Davi', 'Danilo', 'Esposa', 'Ale **', 'Débora ***',
  'Alemão', 'Be', 'Custódio', 'Mayara', 'filho', 'Persio', 'Rozana', 'Gilson', 'esposa', 'filha',
  'Henrique', 'camila', 'Paulo', 'Katia', 'Rei', 'Thiago', 'bruna', '1 filho', '1 filho',
].map((name, index) => ({ id: `noivo-${index + 1}`, name, side: 'Noivo' }));

const giftGroups = [
  {
    category: 'cozinha',
    items: [
      ['Jogo de panelas completo', 650, '🍲'], ['Conjunto de frigideiras', 320, '🍳'], ['Panela de pressão', 280, '🥘'],
      ['Jogo de assadeiras', 190, '🧁'], ['Caçarola de inox', 240, '🫕'], ['Kit de utensílios de cozinha', 160, '🥄'],
      ['Jogo de facas', 230, '🔪'], ['Churrasqueira para o casal', 480, '🥩'], ['Conjunto de potes herméticos', 180, '🫙'],
      ['Cota para equipar a cozinha', 500, '👩‍🍳'],
    ],
  },
  {
    category: 'eletro',
    items: [
      ['Cafeteira elétrica', 290, '☕'], ['Liquidificador', 260, '🥤'], ['Batedeira planetária', 520, '🎂'], ['Torradeira', 210, '🍞'],
      ['Air fryer', 490, '🍟'], ['Sanduicheira', 170, '🥪'], ['Mixer multifuncional', 230, '🧋'], ['Aspirador de pó', 450, '🧹'],
      ['Ferro de passar', 190, '👔'], ['Cota para eletrodomésticos', 700, '🔌'],
    ],
  },
  {
    category: 'mesa',
    items: [
      ['Aparelho de jantar', 420, '🍽️'], ['Jogo de taças de cristal', 310, '🥂'], ['Faqueiro completo', 360, '🍴'],
      ['Jogo de xícaras de café', 180, '☕'], ['Conjunto para sobremesa', 220, '🍰'], ['Travessas para servir', 250, '🥗'],
      ['Jogo de copos', 160, '🥛'], ['Kit para vinho', 230, '🍷'], ['Mesa posta especial', 380, '🕯️'], ['Jantar romântico para os noivos', 300, '🍝'],
    ],
  },
  {
    category: 'casa',
    items: [
      ['Jogo de cama', 320, '🛏️'], ['Kit de toalhas de banho', 240, '🛁'], ['Edredom para o casal', 380, '🧶'],
      ['Travesseiros especiais', 210, '😴'], ['Conjunto de almofadas', 190, '🛋️'], ['Luminária para a nova casa', 260, '💡'],
      ['Tapete para a sala', 350, '🏠'], ['Cortinas para o novo lar', 420, '🪟'], ['Kit de organização', 180, '🧺'],
      ['Cota para decorar a casa', 600, '🪴'],
    ],
  },
  {
    category: 'viagem',
    items: [
      ['Café da manhã na lua de mel', 180, '🥐'], ['Jantar romântico na lua de mel', 350, '💑'],
      ['Passeio especial para os noivos', 450, '🌅'], ['Diária da lua de mel', 650, '🏨'], ['Traslado da viagem', 300, '🚕'],
      ['Ensaio fotográfico da viagem', 500, '📸'], ['Brinde dos recém-casados', 220, '🍾'], ['Malas para a viagem', 580, '🧳'],
      ['Experiência surpresa para o casal', 750, '🎁'], ['Cota para a viagem dos sonhos', 1000, '✈️'],
    ],
  },
];

export const gifts = giftGroups.flatMap((group, groupIndex) => group.items.map(([name, price, emoji], itemIndex) => ({
  id: `gift-${groupIndex * 10 + itemIndex + 1}`,
  name,
  price,
  emoji,
  category: group.category,
})));
