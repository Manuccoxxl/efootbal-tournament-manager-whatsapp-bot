const express = require("express");
const db = require("../utils/db");
const ranking = require("../utils/ranking");
const bracketUtil = require("../utils/bracket");
const { layout, esc } = require("./views");

const router = express.Router();

function playerName(players, id) {
  if (!id) return "BYE";
  return players[id] ? players[id].ign : id;
}

function redirectWithFlash(res, path, flash) {
  res.redirect(`${path}?flash=${encodeURIComponent(flash)}`);
}

// ---------------------------------------------------------------- Overview

router.get("/", (req, res) => {
  const players = db.read("players");
  const tournaments = db.read("tournaments");
  const matches = db.read("matches");
  const queue = db.read("queue");
  const warnings = db.read("warnings");
  const mutes = db.read("mutes");

  const playerCount = Object.keys(players).length;
  const activeTournaments = Object.values(tournaments).filter((t) => t.status !== "complete").length;
  const pendingMatches = Object.values(matches).filter((m) => m.status !== "confirmed").length;
  const queueSize = Object.keys(queue).length;
  const totalWarnings = Object.values(warnings).reduce((sum, arr) => sum + arr.length, 0);
  const activeMutes = Object.entries(mutes).filter(([, m]) => m.until > Date.now()).length;

  const top5 = Object.values(players)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  const body = `
    <h2>Overview</h2>
    <div class="stat-grid">
      <div class="stat"><div class="num">${playerCount}</div><div class="label">Players</div></div>
      <div class="stat"><div class="num">${activeTournaments}</div><div class="label">Active Tournaments</div></div>
      <div class="stat"><div class="num">${pendingMatches}</div><div class="label">Pending Matches</div></div>
      <div class="stat"><div class="num">${queueSize}</div><div class="label">In Queue</div></div>
      <div class="stat"><div class="num">${totalWarnings}</div><div class="label">Total Warnings</div></div>
      <div class="stat"><div class="num">${activeMutes}</div><div class="label">Active Mutes</div></div>
    </div>
    <div class="card">
      <h2>Top 5 by Rating</h2>
      ${
        top5.length
          ? `<table><tr><th>#</th><th>Player</th><th>Rating</th><th>Division</th></tr>${top5
              .map(
                (p, i) =>
                  `<tr><td>${i + 1}</td><td>${esc(p.ign)}</td><td>${p.rating}</td><td>${esc(
                    ranking.divisionForRating(p.rating)
                  )}</td></tr>`
              )
              .join("")}</table>`
          : `<div class="empty">No registered players yet.</div>`
      }
    </div>
  `;
  res.send(layout("/", "Overview", body, req.query.flash));
});

// ----------------------------------------------------------------- Players

router.get("/players", (req, res) => {
  const players = db.read("players");
  const warnings = db.read("warnings");
  const mutes = db.read("mutes");

  const rows = Object.entries(players)
    .sort((a, b) => b[1].rating - a[1].rating)
    .map(([id, p]) => {
      const wCount = (warnings[id] || []).length;
      const isMuted = mutes[id] && mutes[id].until > Date.now();
      const encId = encodeURIComponent(id);
      const formId = `f-${encId}`;
      // The edit form's inputs live inside separate <td> cells, which a <form>
      // element can't legally wrap around. Instead the <form> tag itself is
      // empty and placed once; each input references it via form="formId"
      // (valid HTML5) so they still submit together.
      return `<tr>
        <td>
          <form id="${formId}" class="inline" method="POST" action="/players/${encId}/update"></form>
          <input form="${formId}" type="text" name="ign" value="${esc(p.ign)}" style="width:120px">
        </td>
        <td class="muted" style="font-size:12px">${esc(id)}</td>
        <td><input form="${formId}" type="number" name="rating" value="${p.rating}" style="width:70px"></td>
        <td>${esc(ranking.divisionForRating(p.rating))}</td>
        <td><input form="${formId}" type="number" name="xp" value="${p.xp}" style="width:70px"> (Lv.${ranking.levelForXp(p.xp)})</td>
        <td><input form="${formId}" type="number" name="coins" value="${p.coins || 0}" style="width:70px"></td>
        <td>${p.wins}-${p.losses}-${p.draws}</td>
        <td>${p.mvps || 0}</td>
        <td>
            <button form="${formId}" type="submit">Save</button>
        </td>
        <td>
          <div class="row-actions">
            ${wCount > 0 ? `<span class="pill pill-yellow">${wCount} warn</span>` : `<span class="pill pill-grey">0 warn</span>`}
            ${isMuted ? `<span class="pill pill-red">muted</span>` : ""}
            ${wCount > 0 ? `<form class="inline" method="POST" action="/players/${encId}/clearwarnings"><button type="submit" class="secondary">Clear warnings</button></form>` : ""}
            ${isMuted ? `<form class="inline" method="POST" action="/players/${encId}/unmute"><button type="submit" class="secondary">Unmute</button></form>` : ""}
            <form class="inline" method="POST" action="/players/${encId}/delete" onsubmit="return confirm('Remove this player\\'s registration? This cannot be undone.');">
              <button type="submit" class="danger">Delete</button>
            </form>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  const body = `
    <h2>Players</h2>
    <div class="card">
      ${
        rows
          ? `<div style="overflow-x:auto"><table>
        <tr><th>IGN</th><th>ID</th><th>Rating</th><th>Division</th><th>XP</th><th>Coins</th><th>W-L-D</th><th>MVPs</th><th></th><th>Moderation</th></tr>
        ${rows}
      </table></div>`
          : `<div class="empty">No registered players yet. Players register from WhatsApp with <code>!register</code>.</div>`
      }
    </div>
  `;
  res.send(layout("/players", "Players", body, req.query.flash));
});

router.post("/players/:id/update", (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const players = db.read("players");
  const p = players[id];
  if (p) {
    if (typeof req.body.ign === "string" && req.body.ign.trim()) p.ign = req.body.ign.trim();
    if (req.body.rating !== undefined) p.rating = Math.max(0, parseInt(req.body.rating, 10) || 0);
    if (req.body.xp !== undefined) p.xp = Math.max(0, parseInt(req.body.xp, 10) || 0);
    if (req.body.coins !== undefined) p.coins = Math.max(0, parseInt(req.body.coins, 10) || 0);
    db.write("players", players);
  }
  redirectWithFlash(res, "/players", "Player updated.");
});

router.post("/players/:id/clearwarnings", (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const warnings = db.read("warnings");
  warnings[id] = [];
  db.write("warnings", warnings);
  redirectWithFlash(res, "/players", "Warnings cleared.");
});

router.post("/players/:id/unmute", (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const mutes = db.read("mutes");
  delete mutes[id];
  db.write("mutes", mutes);
  redirectWithFlash(res, "/players", "Player unmuted.");
});

router.post("/players/:id/delete", (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const players = db.read("players");
  delete players[id];
  db.write("players", players);
  redirectWithFlash(res, "/players", "Player registration deleted.");
});

// -------------------------------------------------------------- Tournaments

router.get("/tournaments", (req, res) => {
  const tournaments = db.read("tournaments");
  const list = Object.values(tournaments).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const statusPill = { registration: "pill-green", in_progress: "pill-yellow", complete: "pill-grey" };
  const statusLabel = { registration: "Open", in_progress: "In progress", complete: "Complete" };

  const rows = list
    .map(
      (t) => `<tr>
        <td>${esc(t.name)}</td>
        <td><span class="pill ${statusPill[t.status]}">${statusLabel[t.status]}</span></td>
        <td>${t.players.length}${t.maxPlayers ? `/${t.maxPlayers}` : ""}</td>
        <td class="row-actions">
          <a href="/tournaments/${encodeURIComponent(t.id)}"><button class="secondary">View</button></a>
          <form class="inline" method="POST" action="/tournaments/${encodeURIComponent(t.id)}/delete" onsubmit="return confirm('Delete this tournament?');">
            <button type="submit" class="danger">Delete</button>
          </form>
        </td>
      </tr>`
    )
    .join("");

  const body = `
    <h2>Tournaments</h2>
    <div class="card">
      <h2 style="font-size:15px">Create tournament</h2>
      <form method="POST" action="/tournaments/create" class="row-actions">
        <input type="text" name="name" placeholder="Name" required>
        <input type="number" name="maxPlayers" placeholder="Max players (optional)">
        <button type="submit">Create</button>
      </form>
    </div>
    <div class="card">
      ${
        rows
          ? `<table><tr><th>Name</th><th>Status</th><th>Players</th><th></th></tr>${rows}</table>`
          : `<div class="empty">No tournaments yet.</div>`
      }
    </div>
  `;
  res.send(layout("/tournaments", "Tournaments", body, req.query.flash));
});

router.post("/tournaments/create", (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) return redirectWithFlash(res, "/tournaments", "Name is required.");
  const id = name.toLowerCase().replace(/\s+/g, "-");
  const tournaments = db.read("tournaments");
  if (tournaments[id]) return redirectWithFlash(res, "/tournaments", "A tournament with that name already exists.");

  const maxPlayers = req.body.maxPlayers ? parseInt(req.body.maxPlayers, 10) : null;
  tournaments[id] = {
    name,
    id,
    maxPlayers: maxPlayers || null,
    status: "registration",
    players: [],
    bracket: null,
    createdAt: new Date().toISOString(),
  };
  db.write("tournaments", tournaments);
  redirectWithFlash(res, "/tournaments", `Tournament "${name}" created.`);
});

router.post("/tournaments/:id/delete", (req, res) => {
  const tournaments = db.read("tournaments");
  delete tournaments[req.params.id];
  db.write("tournaments", tournaments);
  redirectWithFlash(res, "/tournaments", "Tournament deleted.");
});

router.get("/tournaments/:id", (req, res) => {
  const tournaments = db.read("tournaments");
  const t = tournaments[req.params.id];
  if (!t) return res.status(404).send(layout("/tournaments", "Not found", `<div class="empty">Tournament not found.</div>`));

  const players = db.read("players");

  let bracketHtml = `<div class="empty">Registration open — not started yet.</div>`;
  if (t.bracket) {
    const cols = t.bracket.rounds
      .map((round, ri) => {
        const matches = round
          .map((m, mi) => {
            const p1 = esc(playerName(players, m.p1));
            const p2 = esc(playerName(players, m.p2));
            const p1cls = m.winner && m.winner === m.p1 ? "winner" : "";
            const p2cls = m.winner && m.winner === m.p2 ? "winner" : "";
            const scoreLabel = m.score && m.score !== "BYE" ? ` <span class="muted">(${esc(m.score)})</span>` : "";
            const canReport = m.p1 && m.p2 && !m.winner;
            return `<div class="bracket-match">
              <div class="p ${p1cls}">${p1}${p1cls ? scoreLabel : ""}</div>
              <div class="p ${p2cls}">${p2}${p2cls ? scoreLabel : ""}</div>
              ${
                canReport
                  ? `<form method="POST" action="/tournaments/${encodeURIComponent(t.id)}/report" class="row-actions" style="margin-top:6px">
                       <input type="hidden" name="round" value="${ri}">
                       <input type="hidden" name="match" value="${mi}">
                       <input type="text" name="score" placeholder="e.g. 3-1" style="width:70px" required>
                       <button type="submit">Report</button>
                     </form>`
                  : ""
              }
            </div>`;
          })
          .join("");
        return `<div class="bracket-round"><h4>Round ${ri + 1}</h4>${matches}</div>`;
      })
      .join("");
    bracketHtml = `<div class="bracket-wrap">${cols}</div>`;
  }

  const statusLabel = { registration: "Open for registration", in_progress: "In progress", complete: "Complete" }[t.status];

  const body = `
    <p><a href="/tournaments" class="muted">&larr; Back to tournaments</a></p>
    <h2>${esc(t.name)} <span class="pill pill-grey">${statusLabel}</span></h2>
    <div class="card">
      <h2 style="font-size:15px">Players (${t.players.length}${t.maxPlayers ? `/${t.maxPlayers}` : ""})</h2>
      ${
        t.players.length
          ? `<p>${t.players.map((id) => esc(playerName(players, id))).join(", ")}</p>`
          : `<div class="empty">No players joined yet.</div>`
      }
      ${
        t.status === "registration"
          ? `<form method="POST" action="/tournaments/${encodeURIComponent(t.id)}/start" onsubmit="return confirm('Start the tournament and generate the bracket?');">
               <button type="submit">Start tournament</button>
             </form>`
          : ""
      }
    </div>
    <div class="card">
      <h2 style="font-size:15px">Bracket</h2>
      ${bracketHtml}
    </div>
  `;
  res.send(layout("/tournaments", t.name, body, req.query.flash));
});

router.post("/tournaments/:id/start", (req, res) => {
  const tournaments = db.read("tournaments");
  const t = tournaments[req.params.id];
  if (!t) return redirectWithFlash(res, "/tournaments", "Tournament not found.");
  if (t.status !== "registration") return redirectWithFlash(res, `/tournaments/${req.params.id}`, "Already started.");
  if (t.players.length < 2) return redirectWithFlash(res, `/tournaments/${req.params.id}`, "Need at least 2 players.");

  t.bracket = bracketUtil.generateBracket(t.players);
  t.status = "in_progress";
  db.write("tournaments", tournaments);
  redirectWithFlash(res, `/tournaments/${req.params.id}`, "Tournament started.");
});

router.post("/tournaments/:id/report", (req, res) => {
  const tournaments = db.read("tournaments");
  const t = tournaments[req.params.id];
  const path = `/tournaments/${req.params.id}`;
  if (!t || !t.bracket) return redirectWithFlash(res, path, "Tournament not found or not started.");

  const roundIndex = parseInt(req.body.round, 10);
  const matchIndex = parseInt(req.body.match, 10);
  const scoreArg = (req.body.score || "").trim();
  if (!/^\d+-\d+$/.test(scoreArg)) return redirectWithFlash(res, path, "Score must look like 3-1.");

  const match = t.bracket.rounds[roundIndex] && t.bracket.rounds[roundIndex][matchIndex];
  if (!match || !match.p1 || !match.p2) return redirectWithFlash(res, path, "That match isn't ready to be reported.");

  const [s1, s2] = scoreArg.split("-").map(Number);
  const winnerId = s1 > s2 ? match.p1 : s2 > s1 ? match.p2 : null;
  if (!winnerId) return redirectWithFlash(res, path, "Tournament matches can't end in a draw.");

  const ok = bracketUtil.recordResult(t.bracket, roundIndex, matchIndex, winnerId, scoreArg);
  if (!ok) return redirectWithFlash(res, path, "Couldn't record that result.");

  const players = db.read("players");
  const loserId = winnerId === match.p1 ? match.p2 : match.p1;
  if (players[winnerId] && players[loserId]) {
    ranking.applyResult(players[winnerId], players[loserId], "win");
    db.write("players", players);
  }

  let flash = "Result recorded.";
  if (bracketUtil.isComplete(t.bracket)) {
    t.status = "complete";
    const champId = bracketUtil.champion(t.bracket);
    if (players[champId]) {
      players[champId].mvps = (players[champId].mvps || 0) + 1;
      db.write("players", players);
    }
    flash = `Result recorded. ${playerName(players, champId)} is the champion!`;
  }

  db.write("tournaments", tournaments);
  redirectWithFlash(res, path, flash);
});

// ------------------------------------------------------------------ Matches

router.get("/matches", (req, res) => {
  const matches = db.read("matches");
  const players = db.read("players");
  const statusPill = { pending: "pill-grey", reported: "pill-yellow", confirmed: "pill-green" };

  const list = Object.entries(matches).sort((a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt));
  const rows = list
    .map(([id, m]) => {
      const scoreLabel = m.reportedScore ? `${m.reportedScore.a}-${m.reportedScore.b}` : "-";
      return `<tr>
        <td><code>${esc(id)}</code></td>
        <td>${esc(playerName(players, m.playerA))} vs ${esc(playerName(players, m.playerB))}</td>
        <td>${scoreLabel}</td>
        <td><span class="pill ${statusPill[m.status]}">${m.status}</span></td>
        <td class="row-actions">
          ${
            m.status === "reported"
              ? `<form class="inline" method="POST" action="/matches/${encodeURIComponent(id)}/confirm"><button type="submit">Force confirm</button></form>`
              : ""
          }
          <form class="inline" method="POST" action="/matches/${encodeURIComponent(id)}/delete" onsubmit="return confirm('Delete this match record?');">
            <button type="submit" class="danger">Delete</button>
          </form>
        </td>
      </tr>`;
    })
    .join("");

  const body = `
    <h2>Casual Matches</h2>
    <div class="card">
      ${
        rows
          ? `<div style="overflow-x:auto"><table><tr><th>ID</th><th>Players</th><th>Score</th><th>Status</th><th></th></tr>${rows}</table></div>`
          : `<div class="empty">No matches yet. Players create these via <code>!queue</code> and <code>!reportscore</code>.</div>`
      }
    </div>
  `;
  res.send(layout("/matches", "Matches", body, req.query.flash));
});

router.post("/matches/:id/confirm", (req, res) => {
  const matches = db.read("matches");
  const m = matches[req.params.id];
  if (!m || m.status !== "reported") return redirectWithFlash(res, "/matches", "Nothing to confirm.");

  const players = db.read("players");
  const pA = players[m.playerA];
  const pB = players[m.playerB];
  if (pA && pB) {
    const { a, b } = m.reportedScore;
    const result = a > b ? "win" : a < b ? "loss" : "draw";
    ranking.applyResult(pA, pB, result);
    db.write("players", players);
  }
  m.status = "confirmed";
  db.write("matches", matches);
  redirectWithFlash(res, "/matches", "Match confirmed and ratings updated.");
});

router.post("/matches/:id/delete", (req, res) => {
  const matches = db.read("matches");
  delete matches[req.params.id];
  db.write("matches", matches);
  redirectWithFlash(res, "/matches", "Match record deleted.");
});

// -------------------------------------------------------------------- Queue

router.get("/queue", (req, res) => {
  const queue = db.read("queue");
  const players = db.read("players");
  const rows = Object.entries(queue)
    .map(
      ([id, q]) => `<tr>
        <td>${esc(playerName(players, id))}</td>
        <td>${q.rating}</td>
        <td class="muted">${new Date(q.joinedAt).toLocaleString()}</td>
        <td><form class="inline" method="POST" action="/queue/${encodeURIComponent(id)}/remove"><button type="submit" class="danger">Remove</button></form></td>
      </tr>`
    )
    .join("");

  const body = `
    <h2>Matchmaking Queue</h2>
    <div class="card">
      ${
        rows
          ? `<table><tr><th>Player</th><th>Rating</th><th>Joined</th><th></th></tr>${rows}</table>`
          : `<div class="empty">Queue is empty.</div>`
      }
    </div>
  `;
  res.send(layout("/queue", "Queue", body, req.query.flash));
});

router.post("/queue/:id/remove", (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const queue = db.read("queue");
  delete queue[id];
  db.write("queue", queue);
  redirectWithFlash(res, "/queue", "Removed from queue.");
});

// ------------------------------------------------------------- Moderation

router.get("/moderation", (req, res) => {
  const warnings = db.read("warnings");
  const mutes = db.read("mutes");
  const players = db.read("players");

  const warnRows = Object.entries(warnings)
    .filter(([, list]) => list.length > 0)
    .map(
      ([id, list]) => `<tr>
        <td>${esc(playerName(players, id))}</td>
        <td>${list.length}</td>
        <td class="muted">${esc(list[list.length - 1].reason)}</td>
        <td><form class="inline" method="POST" action="/players/${encodeURIComponent(id)}/clearwarnings"><button type="submit" class="secondary">Clear</button></form></td>
      </tr>`
    )
    .join("");

  const muteRows = Object.entries(mutes)
    .filter(([, m]) => m.until > Date.now())
    .map(
      ([id, m]) => `<tr>
        <td>${esc(playerName(players, id))}</td>
        <td>${new Date(m.until).toLocaleString()}</td>
        <td><form class="inline" method="POST" action="/players/${encodeURIComponent(id)}/unmute"><button type="submit" class="secondary">Unmute</button></form></td>
      </tr>`
    )
    .join("");

  const body = `
    <h2>Moderation</h2>
    <div class="card">
      <h2 style="font-size:15px">Warnings</h2>
      ${
        warnRows
          ? `<table><tr><th>Player</th><th>Count</th><th>Latest reason</th><th></th></tr>${warnRows}</table>`
          : `<div class="empty">No active warnings.</div>`
      }
    </div>
    <div class="card">
      <h2 style="font-size:15px">Active mutes</h2>
      ${
        muteRows
          ? `<table><tr><th>Player</th><th>Until</th><th></th></tr>${muteRows}</table>`
          : `<div class="empty">No one is currently muted.</div>`
      }
    </div>
  `;
  res.send(layout("/moderation", "Moderation", body, req.query.flash));
});

module.exports = router;
