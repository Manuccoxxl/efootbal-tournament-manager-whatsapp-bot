const db = require("../utils/db");
const ranking = require("../utils/ranking");

async function leaderboard(msg, args) {
  const mode = (args[0] || "rating").toLowerCase();
  const players = db.read("players");
  const entries = Object.values(players);

  if (entries.length === 0) {
    return msg.reply("No registered players yet.");
  }

  let sorted, label, lineFor;
  if (mode === "mvp" || mode === "mvps") {
    sorted = entries.sort((a, b) => (b.mvps || 0) - (a.mvps || 0));
    label = "🏅 MVP Leaderboard";
    lineFor = (p) => `${p.mvps || 0} MVPs — ${p.ign}`;
  } else if (mode === "level" || mode === "xp") {
    sorted = entries.sort((a, b) => b.xp - a.xp);
    label = "⭐ Level Leaderboard";
    lineFor = (p) => `Lv.${ranking.levelForXp(p.xp)} (${p.xp} XP) — ${p.ign}`;
  } else if (mode === "coins") {
    sorted = entries.sort((a, b) => (b.coins || 0) - (a.coins || 0));
    label = "🪙 Coins Leaderboard";
    lineFor = (p) => `${p.coins || 0} coins — ${p.ign}`;
  } else {
    sorted = entries.sort((a, b) => b.rating - a.rating);
    label = "🏆 Ranking Leaderboard";
    lineFor = (p) => `${p.rating} rating (${ranking.divisionForRating(p.rating)}) — ${p.ign}`;
  }

  const top = sorted.slice(0, 10);
  const lines = top.map((p, i) => `${i + 1}. ${lineFor(p)}`);

  return msg.reply(`${label}\n\n${lines.join("\n")}`);
}

module.exports = { leaderboard };
