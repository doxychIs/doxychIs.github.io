import { defineConfig } from 'astro/config';
import config from './business.config.json' with { type: 'json' };
export default defineConfig({ site: config.siteUrl ? new URL(config.siteUrl).origin : undefined, base: config.basePath || '/', output: 'static', devToolbar: { enabled: false } });
