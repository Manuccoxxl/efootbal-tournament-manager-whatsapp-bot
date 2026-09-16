const db = require("../utils/db");
const config = require("../config");
const ranking = require("../utils/ranking");
const bracket = require("../utils/bracket");
const { displayName, mentionText } = require("../utils/format");

function slug(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

async function createTournament(msg, args, isAdminSender) {
  if (!isAdminSender) return msg.reply("Only admins can create tournaments.");
  const maxPlayersArg = args[args.length - 1];
  const maxPlayers = /^\d+$/.test(maxPlayersArg) ? parseInt(maxPlayersArg, 10) : null;
  const nameArgs = maxPlayers ? args.slice(0, -1) : args;
  const name = nameArgs.join(" ").trim();

  if (!name) {
    return msg.reply(`Usage: ${config.PREFIX}tournament create <name> [max players]\nExample: ${config.PREFIX}tournament create Weekend Cup 8`);
  }

  const id = slug(name);
  const tournaments = db.read("tournaments");
  if (tournaments[id]) return msg.reply("A tournament with that name already exists.");

  tournaments[id] = {
    name,
    id,
    maxPlayers: maxPlayers || null,
    status: "registration", // registration -> in_progress -> complete
    players: [],
    bracket: null,
    createdAt: new Date().toISOString(),
  };
  db.write("tournaments", tournaments);

  return msg.reply(
    `🏆 Tournament created: *${name}*${maxPlayers ? ` (max ${maxPlayers} players)` : ""}\n` +
      `Players join with: ${config.PREFIX}tournament join ${name}`
  );
}

async function joinTournament(msg, args) {
  const senderId = msg.author || msg.from;
  const name = args.join(" ").trim();
  if (!name) return msg.reply(`Usage: ${config.PREFIX}tournament join <name>`);

  const players = db.read("players");
  if (!players[senderId]) {
    return msg.reply(`Register first with ${config.PREFIX}register <your EA/PSN ID>.`);
  }

  const tournaments = db.read("tournaments");
  const t = tournaments[slug(name)];
  if (!t) return msg.reply("No tournament with that name. Check the name or ask an admin to create it.");
  if (t.status !== "registration") return msg.reply("Registration for this tournament is closed.");
  if (t.players.includes(senderId)) return msg.reply("You're already in this tournament.");
  if (t.maxPlayers && t.players.length >= t.maxPlayers) return msg.reply("This tournament is full.");

  t.players.push(senderId);
  db.write("tournaments", tournaments);

  return msg.reply(`✅ ${players[senderId].ign} joined *${t.name}* (${t.players.length}${t.maxPlayers ? `/${t.maxPlayers}` : ""} players).`);
}

async function startTournament(msg, args, isAdminSender) {
  if (!isAdminSender) return msg.reply("Only admins can start tournaments.");
  const name = args.join(" ").trim();
  if (!name) return msg.reply(`Usage: ${config.PREFIX}tournament start <name>`);

  const tournaments = db.read("tournaments");
  const t = tournaments[slug(name)];
  if (!t) return msg.reply("No tournament with that name.");
  if (t.status !== "registration") return msg.reply("This tournament has already started.");
  if (t.players.length < 2) return msg.reply("Need at least 2 players to start.");

  t.bracket = bracket.generateBracket(t.players);
  t.status = "in_progress";
  db.write("tournaments", tournaments);

  return msg.reply(
    `🚀 *${t.name}* has started with ${t.players.length} players!\n\n${renderBracket(t)}\n\n` +
      `Admins report results with:\n${config.PREFIX}tournament report ${t.name} <round> <match> <score>`
  );
}

function playerName(players, id) {
  if (!id) return "BYE";
  return players[id] ? players[id].ign : id;
}

function renderBracket(t) {
  const players = db.read("players");
  const lines = [];
  t.bracket.rounds.forEach((round, ri) => {
    lines.push(`*Round ${ri + 1}*`);
    round.forEach((m, mi) => {
      const p1 = playerName(players, m.p1);
      const p2 = playerName(players, m.p2);
      const status = m.winner ? `✅ ${playerName(players, m.winner)} won${m.score && m.score !== "BYE" ? ` (${m.score})` : ""}` : "⏳ pending";
      lines.push(`  [${mi}] ${p1} vs ${p2} — ${status}`);
    });
  });
  return lines.join("\n");
}

async function showBracket(msg, args) {
  const name = args.join(" ").trim();
  if (!name) return msg.reply(`Usage: ${config.PREFIX}tournament bracket <name>`);
  const tournaments = db.read("tournaments");
  const t = tournaments[slug(name)];
  if (!t) return msg.reply("No tournament with that name.");
  if (!t.bracket) return msg.reply("This tournament hasn't started yet.");
  return msg.reply(`🏆 *${t.name}*\n\n${renderBracket(t)}`);
}

/**
 * !tournament report <name> <round> <matchIndex> <score>
 * Score format "3-1" is interpreted as p1-p2 for that match slot.
 * Admin-only to avoid disputes; pair with !reportscore/!confirm flow
 * for casual matches instead.
 */
async function reportTournamentMatch(msg, args, isAdminSender) {
  if (!isAdminSender) return msg.reply("Only admins can report tournament results.");
  if (args.length < 4) {
    return msg.reply(`Usage: ${config.PREFIX}tournament report <name> <round> <match> <score>\nExample: ${config.PREFIX}tournament report Weekend Cup 0 1 3-1`);
  }
  const scoreArg = args.pop();
  const matchIndex = parseInt(args.pop(), 10);
  const roundIndex = parseInt(args.pop(), 10);
  const name = args.join(" ").trim();

  if (!/^\d+-\d+$/.test(scoreArg) || Number.isNaN(matchIndex) || Number.isNaN(roundIndex)) {
    return msg.reply("Invalid format. Score must look like 3-1, and round/match must be numbers.");
  }

  const tournaments = db.read("tournaments");
  const t = tournaments[slug(name)];
  if (!t) return msg.reply("No tournament with that name.");
  if (!t.bracket) return msg.reply("This tournament hasn't started.");

  const match = t.bracket.rounds[roundIndex] && t.bracket.rounds[roundIndex][matchIndex];
  if (!match) return msg.reply("No match at that round/index.");
  if (!match.p1 || !match.p2) return msg.reply("Both players for this match aren't decided yet.");

  const [s1, s2] = scoreArg.split("-").map(Number);
  const winnerId = s1 > s2 ? match.p1 : s2 > s1 ? match.p2 : null;
  if (!winnerId) return msg.reply("Tournament matches can't end in a draw — report a decisive score.");

  const ok = bracket.recordResult(t.bracket, roundIndex, matchIndex, winnerId, scoreArg);
  if (!ok) return msg.reply("Couldn't record that result — double check the round/match numbers.");

  // Apply ranking effects too, same as a normal match
  const players = db.read("players");
  const pWinner = players[winnerId];
  const loserId = winnerId === match.p1 ? match.p2 : match.p1;
  const pLoser = players[loserId];
  if (pWinner && pLoser) {
    ranking.applyResult(pWinner, pLoser, "win");
    db.write("players", players);
  }

  let resultMsg = `✅ Recorded: ${playerName(players, match.p1)} ${scoreArg} ${playerName(players, match.p2)}`;

  if (bracket.isComplete(t.bracket)) {
    t.status = "complete";
    const champId = bracket.champion(t.bracket);
    const champName = playerName(players, champId);
    resultMsg += `\n\n🎉 *${champName}* is the champion of ${t.name}!`;
    if (players[champId]) {
      players[champId].mvps = (players[champId].mvps || 0) + 1;
      db.write("players", players);
    }
  }

  db.write("tournaments", tournaments);
  return msg.reply(resultMsg + `\n\n${renderBracket(t)}`);
}

async function standings(msg, args) {
  const name = args.join(" ").trim();
  if (!name) return msg.reply(`Usage: ${config.PREFIX}tournament standings <name>`);
  const tournaments = db.read("tournaments");
  const t = tournaments[slug(name)];
  if (!t) return msg.reply("No tournament with that name.");

  const players = db.read("players");
  const lines = t.players.map((id) => `- ${playerName(players, id)}`);
  const statusLabel = { registration: "Open for registration", in_progress: "In progress", complete: "Complete" }[t.status];
  return msg.reply(`🏆 *${t.name}* — ${statusLabel}\nPlayers (${t.players.length}${t.maxPlayers ? `/${t.maxPlayers}` : ""}):\n${lines.join("\n") || "(none yet)"}`);
}

async function listTournaments(msg) {
  const tournaments = db.read("tournaments");
  const all = Object.values(tournaments);
  if (all.length === 0) return msg.reply("No tournaments yet.");
  const statusLabel = { registration: "🟢 open", in_progress: "🟡 in progress", complete: "⚪ complete" };
  const lines = all.map((t) => `- ${t.name} (${statusLabel[t.status]}, ${t.players.length}${t.maxPlayers ? `/${t.maxPlayers}` : ""} players)`);
  return msg.reply(`🏆 Tournaments:\n${lines.join("\n")}`);
}

module.exports = {
  createTournament,
  joinTournament,
  startTournament,
  showBracket,
  reportTournamentMatch,
  standings,
  listTournaments,
};
