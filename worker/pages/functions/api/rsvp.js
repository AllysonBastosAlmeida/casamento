import handler from '../../../src/index.js';

export const onRequest = context => handler.fetch(context.request);
