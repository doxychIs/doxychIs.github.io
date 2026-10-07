const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export function withBase(path: string): string {
  return path.startsWith('/') && !path.startsWith('//') ? `${base}${path}` : path;
}
export function withSrcset(value: string): string {
  return value.split(',').map(item => item.trim().replace(/^\S+/, withBase)).join(', ');
}
