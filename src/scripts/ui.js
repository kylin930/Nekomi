import { message } from '../config/messages.mjs';
import { createFormatters } from '../lib/formatting.mjs';
let settings, formatters;
export function configureUI(data) { settings = data; formatters = undefined; }
const data = () => settings ||= JSON.parse(document.getElementById('site-data').textContent);
export const say = (group, key, values) => message(data().ui[group][key], values);
export const commentTime = value => (formatters ||= createFormatters(data().publishing)).commentTime(value);
