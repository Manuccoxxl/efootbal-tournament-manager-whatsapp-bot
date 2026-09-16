const db = require("../utils/db");
const config = require("../config");
const ranking = require("../utils/ranking");
const { displayName, mentionText, firstMention } = require("../utils/format");

function newPlayer(ign) {
  return {
    ign,
    rating: config.STARTING_RATING,
    wins: 0,
    losses: 0,
    draws: 0,
    xp: 0,
    coins: 0,
    mvps: 0,
    warnings: 0,
    registeredAt: new Date().toISOString(),
  };
}

async function register(msg, args) {
  const senderId = msg.author || msg.from;
  const ign = args.join(" ").trim();
  if (!ign) {
    return msg.reply(
      `Usage: ${config.PREFIX}register <your EA/PSN ID>\nExample: ${config.PREFIX}register MessiFan10`
    );
  }

  const players = db.read("players");
  if (players[senderId]) {
    return msg.reply(
      `You're already registered as *${players[senderId].ign}*. Use ${config.PREFIX}rename <new id> to change it.`
    );
  }

  players[senderId] = newPlayer(ign);
  db.write("players", players);

  return msg.reply(
    `✅ Registered! Welcome, *${ign}*.\nStarting rating: ${config.STARTING_RATING} (${ranking.divisionForRating(
      config.STARTING_RATING
    )})\nUse ${config.PREFIX}profile to check your stats any time.`
  );
}

async function rename(msg, args) {
  const senderId = msg.author || msg.from;
  const ign = args.join(" ").trim();
  const players = db.read("players");
  if (!players[senderId]) {
    return msg.reply(`You're not registered yet. Use ${config.PREFIX}register <your EA/PSN ID> first.`);
  }
  if (!ign) {
    return msg.reply(`Usage: ${config.PREFIX}rename <new EA/PSN ID>`);
  }
  players[senderId].ign = ign;
  db.write("players", players);
  return msg.reply(`✅ Updated your ID to *${ign}*.`);
}

async function profile(msg) {
  const senderId = msg.author || msg.from;
  const targetId = (await firstMention(msg)) || senderId;

  const players = db.read("players");
  const p = players[targetId];
  if (!p) {
    return msg.reply(
      targetId === senderId
        ? `You're not registered yet. Use ${config.PREFIX}register <your EA/PSN ID>.`
        : `That player isn't registered.`
    );
  }

  const totalGames = p.wins + p.losses + p.draws;
  const winRate = totalGames ? ((p.wins / totalGames) * 100).toFixed(1) : "0.0";
  const level = ranking.levelForXp(p.xp);
  const xpToNext = ranking.xpToNextLevel(p.xp);
  const division = ranking.divisionForRating(p.rating);

  const text = [
    `📋 *${p.ign}*`,
    `Division: ${division} (${p.rating} rating)`,
    `Level ${level} — ${xpToNext} XP to next level`,
    `Record: ${p.wins}W-${p.losses}L-${p.draws}D (${winRate}% win rate)`,
    `MVPs: ${p.mvps || 0}`,
    `Coins: ${p.coins || 0}`,
  ].join("\n");

  return msg.reply(text);
}

module.exports = { register, rename, profile, newPlayer };
