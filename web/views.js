const config = require("../config");

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/players", label: "Players" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/matches", label: "Matches" },
  { href: "/queue", label: "Queue" },
  { href: "/moderation", label: "Moderation" },
];

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function layout(activePath, title, bodyHtml, flash) {
  const navHtml = NAV.map(
    (n) =>
      `<a href="${n.href}" class="nav-link${n.href === activePath ? " active" : ""}">${n.label}</a>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} — eFootball Bot Dashboard</title>
<style>
  :root {
    --bg: #0f1115; --panel: #171a21; --panel2: #1e222b; --border: #2a2f3a;
    --text: #e7e9ee; --muted: #8b92a5; --accent: #4f7cff; --accent2: #22c55e;
    --danger: #ef4444; --warn: #f59e0b;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  header { background: var(--panel); border-bottom: 1px solid var(--border); padding: 14px 24px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
  header h1 { font-size: 16px; margin: 0; font-weight: 600; white-space: nowrap; }
  nav { display: flex; gap: 4px; flex-wrap: wrap; }
  .nav-link { color: var(--muted); text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 14px; }
  .nav-link:hover { background: var(--panel2); color: var(--text); }
  .nav-link.active { background: var(--accent); color: white; }
  main { padding: 24px; max-width: 1100px; margin: 0 auto; }
  h2 { font-size: 20px; margin-top: 0; }
  .card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 18px; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  th { color: var(--muted); font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; }
  tr:last-child td { border-bottom: none; }
  .muted { color: var(--muted); }
  .pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 12px; }
  .pill-green { background: rgba(34,197,94,0.15); color: var(--accent2); }
  .pill-yellow { background: rgba(245,158,11,0.15); color: var(--warn); }
  .pill-grey { background: rgba(139,146,165,0.15); color: var(--muted); }
  .pill-red { background: rgba(239,68,68,0.15); color: var(--danger); }
  input, select { background: var(--panel2); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 6px 8px; font-size: 13px; width: 90px; }
  input[type=text] { width: 140px; }
  button { background: var(--accent); color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 13px; cursor: pointer; }
  button.secondary { background: var(--panel2); border: 1px solid var(--border); }
  button.danger { background: transparent; border: 1px solid var(--danger); color: var(--danger); }
  button:hover { opacity: 0.85; }
  form.inline { display: inline; }
  .row-actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; }
  .stat { background: var(--panel2); border-radius: 8px; padding: 14px; }
  .stat .num { font-size: 26px; font-weight: 700; }
  .stat .label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; }
  .flash { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.4); color: var(--accent2); padding: 10px 14px; border-radius: 8px; margin-bottom: 18px; font-size: 14px; }
  .empty { color: var(--muted); padding: 20px 0; text-align: center; }
  .bracket-round { display: inline-block; vertical-align: top; margin-right: 28px; min-width: 220px; }
  .bracket-round h4 { color: var(--muted); font-size: 12px; text-transform: uppercase; margin-bottom: 10px; }
  .bracket-match { background: var(--panel2); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; margin-bottom: 14px; font-size: 13px; }
  .bracket-match .p { padding: 2px 0; }
  .bracket-match .winner { color: var(--accent2); font-weight: 600; }
  .bracket-wrap { overflow-x: auto; padding-bottom: 8px; }
  code { background: var(--panel2); padding: 1px 6px; border-radius: 4px; font-size: 12px; }
</style>
</head>
<body>
<header>
  <h1>⚽ eFootball Bot Dashboard</h1>
  <nav>${navHtml}</nav>
</header>
<main>
  ${flash ? `<div class="flash">${esc(flash)}</div>` : ""}
  ${bodyHtml}
</main>
</body>
</html>`;
}

module.exports = { layout, esc, config };
