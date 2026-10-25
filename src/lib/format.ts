import { config } from '../config/site';
import { createFormatters } from './formatting.mjs';
export const { dateLabel, monthLabel, shortDate, commentTime, currentYear } = createFormatters(config.publishing);
