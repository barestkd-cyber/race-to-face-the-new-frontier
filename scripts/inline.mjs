/**
 * Fold the single-file build into one HTML document suitable for hosting as an
 * artifact: no <html>/<head>/<body> wrapper, title and styles first, then the
 * mount point and the whole bundle inline.
 */

import fs from 'node:fs';
import path from 'node:path';

const dist = 'dist-single';
const js = fs.readFileSync(path.join(dist, 'app.js'), 'utf8');

const cssFile = fs
  .readdirSync(dist)
  .find((f) => f.endsWith('.css'));
const css = cssFile ? fs.readFileSync(path.join(dist, cssFile), 'utf8') : '';

// Closing tags inside string literals would end the script element early.
const safeJs = js.replace(/<\/script>/gi, '<\/script>');

const html = `<title>Race to Face the New Frontier</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<style>
${css}
/*
 * The game commits to one visual world - a lit cockpit in the dark - so it
 * carries no light theme. Paint the ground explicitly here so the page holds
 * regardless of the theme the host renders it on, and tell the browser to
 * match its own furniture (scrollbars, focus rings) to it.
 */
:root { color-scheme: dark; }
html, body {
  margin: 0;
  padding: 0;
  background: #06090e;
  color: #c8d0dc;
}
#root { min-height: 100dvh; }
</style>
<div id="root"></div>
<script>
${safeJs}
</script>
`;

const out = path.join(dist, 'frontier.html');
fs.writeFileSync(out, html, 'utf8');
console.log(`${out}  ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB`);
