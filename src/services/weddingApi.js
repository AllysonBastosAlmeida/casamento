const API_URL = import.meta.env.VITE_WEDDING_API_URL?.trim();
const RSVP_PROXY_URL = import.meta.env.VITE_RSVP_PROXY_URL?.trim() || '/api/rsvp';
const STORAGE_KEY = 'wedding-demo-data-v1';

import { initialGuests } from '../config.js';

const readLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { rsvps: [], gifts: [], messages: [], guests: initialGuests };
  } catch {
    return { rsvps: [], gifts: [], messages: [], guests: initialGuests };
  }
};

const writeLocal = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

const request = async (action, payload, accessToken) => {
  if (!API_URL) return null;
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: JSON.stringify({ action, payload }),
  });
  if (!response.ok) throw new Error('Não foi possível salvar. Tente novamente.');
  return response.json();
};

const saveLocalRecord = (collection, payload) => {
  const data = readLocal();
  const record = { ...payload, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  const existing = collection === 'guests' && !data[collection]?.length ? initialGuests : (data[collection] || []);
  data[collection] = [record, ...existing];
  writeLocal(data);
  return record;
};

export const submitRsvp = async (payload) => {
  const response = await fetch(RSVP_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível registrar sua confirmação.');
  return result;
};

export const submitGift = async (payload) =>
  (await request('createGift', payload)) || saveLocalRecord('gifts', payload);

export const submitMessage = async (payload) =>
  (await request('createMessage', payload)) || saveLocalRecord('messages', payload);

export const loadDashboard = async accessToken => {
  const remote = await request('dashboard', {}, accessToken);
  const data = remote?.data || readLocal();
  return { ...data, guests: data.guests?.length ? data.guests : initialGuests };
};

export const addGuest = async (payload, accessToken) => {
  const remote = await request('createGuest', payload, accessToken);
  if (remote) return remote;
  return saveLocalRecord('guests', payload);
};

export const deleteGuest = async (id, accessToken) => {
  const remote = await request('deleteGuest', { id }, accessToken);
  if (remote) return remote;
  const data = readLocal();
  data.guests = (data.guests?.length ? data.guests : initialGuests).filter(item => item.id !== id);
  writeLocal(data);
  return { id };
};

export const isDemoMode = !API_URL;
