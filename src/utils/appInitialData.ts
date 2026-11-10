import * as fixtures from './mockData';

export { loadData, saveData, DEFAULT_SETTINGS } from './mockData';
// A real database that is empty or unavailable must not display demo customers/orders.
const clone = import.meta.env.MODE === 'clone';
export const INITIAL_CLIENTS: typeof fixtures.INITIAL_CLIENTS = clone ? [] : fixtures.INITIAL_CLIENTS;
export const INITIAL_MESSAGES: typeof fixtures.INITIAL_MESSAGES = clone ? {} : fixtures.INITIAL_MESSAGES;
export const INITIAL_HISTORY: typeof fixtures.INITIAL_HISTORY = clone ? [] : fixtures.INITIAL_HISTORY;
export const INITIAL_CAMPAIGNS: typeof fixtures.INITIAL_CAMPAIGNS = clone ? [] : fixtures.INITIAL_CAMPAIGNS;
export const INITIAL_ORDERS: typeof fixtures.INITIAL_ORDERS = clone ? [] : fixtures.INITIAL_ORDERS;
export const INITIAL_AUTOMATIONS: typeof fixtures.INITIAL_AUTOMATIONS = clone ? [] : fixtures.INITIAL_AUTOMATIONS;
export const INITIAL_PRODUCTS_DIGITAL_MENU: typeof fixtures.INITIAL_PRODUCTS_DIGITAL_MENU = clone ? [] : fixtures.INITIAL_PRODUCTS_DIGITAL_MENU;
export const INITIAL_CARDAPIOS: typeof fixtures.INITIAL_CARDAPIOS = clone ? [] : fixtures.INITIAL_CARDAPIOS;
export const INITIAL_DELIVERY_ORDERS: typeof fixtures.INITIAL_DELIVERY_ORDERS = clone ? [] : fixtures.INITIAL_DELIVERY_ORDERS;
export const INITIAL_COURIERS: typeof fixtures.INITIAL_COURIERS = clone ? [] : fixtures.INITIAL_COURIERS;
export const INITIAL_ROUTES: typeof fixtures.INITIAL_ROUTES = clone ? [] : fixtures.INITIAL_ROUTES;
export const INITIAL_COURIER_REVIEWS: typeof fixtures.INITIAL_COURIER_REVIEWS = clone ? [] : fixtures.INITIAL_COURIER_REVIEWS;
export const INITIAL_DELIVERY_HISTORIES: typeof fixtures.INITIAL_DELIVERY_HISTORIES = clone ? [] : fixtures.INITIAL_DELIVERY_HISTORIES;
export const INITIAL_COMMERCIAL_SEGMENTS: typeof fixtures.INITIAL_COMMERCIAL_SEGMENTS = clone ? [] : fixtures.INITIAL_COMMERCIAL_SEGMENTS;
export const INITIAL_CAMPAIGN_TEMPLATES: typeof fixtures.INITIAL_CAMPAIGN_TEMPLATES = clone ? [] : fixtures.INITIAL_CAMPAIGN_TEMPLATES;
export const INITIAL_CAMPAIGN_SCHEDULES: typeof fixtures.INITIAL_CAMPAIGN_SCHEDULES = clone ? [] : fixtures.INITIAL_CAMPAIGN_SCHEDULES;
export const INITIAL_CAMPAIGN_RESULTS: typeof fixtures.INITIAL_CAMPAIGN_RESULTS = clone ? [] : fixtures.INITIAL_CAMPAIGN_RESULTS;
export const INITIAL_CAMPAIGN_REACHES: typeof fixtures.INITIAL_CAMPAIGN_REACHES = clone ? [] : fixtures.INITIAL_CAMPAIGN_REACHES;
