const db = require("../utils/db");
const config = require("../config");
const { firstMention, mentionText } = require("../utils/format");

const DAILY_COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20h, slightly under 24h so it's not punishing

async function balance(msg) {
  const senderId = msg.author || msg.from;
  const targetId = (await firstMention(msg)) || senderId;
  const players = db.read("players");
  const p = players[targetId];
  if (!p) return msg.reply("That player isn't registered.");
  return msg.reply(`🪙 ${p.ign} has ${p.coins || 0} coins.`);
}

async function daily(msg) {
  const senderId = msg.author || msg.from;
  const players = db.read("players");
  const p = players[senderId];
  if (!p) return msg.reply(`Register first with ${config.PREFIX}register <your EA/PSN ID>.`);

  const economy = db.read("economy");
  const record = economy[senderId] || { lastDaily: 0 };
  const now = Date.now();
  if (now - record.lastDaily < DAILY_COOLDOWN_MS) {
    const hoursLeft = Math.ceil((DAILY_COOLDOWN_MS - (now - record.lastDaily)) / (60 * 60 * 1000));
    return msg.reply(`⏳ Already claimed. Try again in about ${hoursLeft}h.`);
  }

  p.coins = (p.coins || 0) + config.DAILY_COINS;
  record.lastDaily = now;
  economy[senderId] = record;
  db.write("players", players);
  db.write("economy", economy);

  return msg.reply(`🪙 +${config.DAILY_COINS} coins claimed! Balance: ${p.coins}`);
}

async function give(msg, args, isAdminSender) {
  if (!isAdminSender) return msg.reply("Only admins can give coins.");
  const targetId = await firstMention(msg);
  const amountArg = args.find((a) => /^-?\d+$/.test(a));
  const amount = amountArg ? parseInt(amountArg, 10) : null;
  if (!targetId || amount === null) return msg.reply(`Usage: ${config.PREFIX}give @player <amount>`);

  const players = db.read("players");
  const p = players[targetId];
  if (!p) return msg.reply("That player isn't registered.");
  p.coins = Math.max(0, (p.coins || 0) + amount);
  db.write("players", players);

  return msg.reply(`✅ ${amount >= 0 ? "Gave" : "Removed"} ${Math.abs(amount)} coins ${amount >= 0 ? "to" : "from"} ${mentionText(targetId)}. New balance: ${p.coins}`);
}

module.exports = { balance, daily, give };
