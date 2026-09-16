const db = require("../utils/db");
const config = require("../config");
const { firstMention } = require("../utils/format");

/**
 * !mvp @user - admin-only, awards an MVP point for a match/tournament/week.
 */
async function awardMvp(msg) {
  const targetId = await firstMention(msg);
  if (!targetId) return msg.reply(`Usage: ${config.PREFIX}mvp @player`);

  const players = db.read("players");
  const p = players[targetId];
  if (!p) return msg.reply("That player isn't registered.");

  p.mvps = (p.mvps || 0) + 1;
  db.write("players", players);

  return msg.reply(`🏅 *${p.ign}* awarded MVP! Total MVPs: ${p.mvps}`);
}

module.exports = { awardMvp };
