# Casamento — Allyson & Mayara

Site responsivo do casamento, com cerimônia e mapa, lista de presentes via PIX, confirmação integrada ao Microsoft Forms e painel conectado ao Excel.

## Desenvolvimento

```bash
npm install
npm run dev
```

O servidor local disponibiliza `/api/rsvp`, que encaminha as confirmações ao Forms. O painel fica em `/#/admin` e exige o PIN antes da autenticação Microsoft.

## Verificações

```bash
npm run check
npm run build
```

## Publicação

O workflow `.github/workflows/deploy.yml` publica o front-end no GitHub Pages. As confirmações são encaminhadas pela função gratuita `https://casamento-rsvp-6kj.pages.dev/api/rsvp`.

O URI `https://allysonbastosalmeida.github.io/casamento/` também deve estar cadastrado como SPA no aplicativo Microsoft Entra usado pelo painel.

## Dados

- Confirmações: Microsoft Forms → tabela `Tabela11`, aba `Form1`, arquivo `Orçamento Web`.
- Presentes, recados e lista editável: Cloudflare Pages Functions + banco D1 `casamento-data`.
- A chave PIX e os valores dos presentes fazem parte do conteúdo público do site.

O PIN do painel é uma barreira visual no front-end, não um segredo criptográfico. O acesso ao Excel continua protegido pelo login Microsoft.
