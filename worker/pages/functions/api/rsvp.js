import handler from '../../../src/index.js';

// As respostas ficam no Forms/Excel; nao manter uma segunda lista no banco.
export const onRequest = context => handler.fetch(context.request);
