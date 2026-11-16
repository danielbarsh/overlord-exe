// Packs the Vite build (dist/) into one self-contained HTML file for publishing as a claude.ai Artifact.
// The host supplies <!doctype>/<head>/<body>, so we emit only the page content with CSS and JS inlined.
// Run after `npm run build`:  node scripts/buildArtifact.mjs
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const assets = join('dist', 'assets');
const files = readdirSync(assets);
const css = readFileSync(join(assets, files.find((f) => f.endsWith('.css'))), 'utf8');
const js = readFileSync(join(assets, files.find((f) => f.endsWith('.js'))), 'utf8').replace(/<\/script/gi, '<\\/script');

const html = `<title>פרוטוקול קריסה</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Orbitron:wght@500;700;900&family=Rubik:wght@400;500;700;900&display=swap">
<style>
:root { color-scheme: dark; }
html, body { height: 100%; background: #05060f; }
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`;

mkdirSync('dist-artifact', { recursive: true });
writeFileSync(join('dist-artifact', 'overlord.html'), html);
console.log(`dist-artifact/overlord.html  ${(html.length / 1024).toFixed(0)} KB`);
