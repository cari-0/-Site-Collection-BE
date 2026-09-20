const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
]);

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);

  url.hash = '';
  url.protocol = 'https:';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }

  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  url.pathname = pathname;

  return url.toString();
}

const PRIVATE_HOST = /^(localhost|.*\.localhost|127\.|10\.|192\.168\.|0\.|::1$)/i;

export function parsePublicUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 500) {
    throw new Error('URL이 올바르지 않습니다.');
  }
  if (/[\s<>"'`]/.test(trimmed)) {
    throw new Error('URL이 올바르지 않습니다.');
  }
  if (/^(javascript|data|file|ftp):/i.test(trimmed)) {
    throw new Error('URL이 올바르지 않습니다.');
  }

  let normalized: string;
  try {
    normalized = normalizeUrl(trimmed);
  } catch {
    throw new Error('URL이 올바르지 않습니다.');
  }
  const host = new URL(normalized).hostname;
  if (!host.includes('.')) {
    throw new Error('사이트 주소에 점(.)이 있어야 합니다. 예: example.com');
  }
  if (PRIVATE_HOST.test(host) || isPrivateIp(host)) {
    throw new Error('공개 사이트 주소만 제보할 수 있습니다.');
  }
  return normalized;
}

function isPrivateIp(host: string) {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}
