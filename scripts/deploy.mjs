// 构建前端并部署到 Cloudflare Pages。
// 用法：npm run pages:deploy

import { execSync } from 'node:child_process';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('==> 构建前端\n');
execSync('npm run build', { stdio: 'inherit' });

console.log('\n==> 部署到 Cloudflare Pages\n');
execSync('npx --yes wrangler@4 pages deploy frontend/dist --project-name=dota-record', {
  stdio: 'inherit',
});

console.log('\n✅ 部署完成：https://dota-record.pages.dev');
