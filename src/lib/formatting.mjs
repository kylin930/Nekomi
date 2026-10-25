// Calendar dates are not instants. Lock their formatting to UTC, irrespective
// of the display zone. Only real timestamps (e.g. comments) are converted.
export function createFormatters({ language = 'zh-CN', timeZone = 'Asia/Shanghai' } = {}) {
  const date = new Intl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const month = new Intl.DateTimeFormat(language, { year: 'numeric', month: 'long', timeZone: 'UTC' });
  const short = new Intl.DateTimeFormat(language, { month: '2-digit', day: '2-digit', timeZone: 'UTC' });
  const comment = new Intl.DateTimeFormat(language, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone });
  const year = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone });
  const calendar = value => new Date(value + 'T00:00:00Z');
  return {
    currentYear: (now = new Date()) => Number(year.format(now)),
    dateLabel: value => date.format(calendar(value)),
    monthLabel: value => month.format(calendar(value + '-01')),
    shortDate: value => short.format(calendar(value)),
    commentTime: value => comment.format(new Date(value)),
  };
}
