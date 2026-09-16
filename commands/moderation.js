const db = require("../utils/db");
const config = require("../config");
const { firstMention, mentionText } = require("../utils/format");

// Simple keyword-based auto-moderation. This is NOT real AI — it's a
// fast, free first line of defense. Add your own banned terms.
const BANNED_WORDS = [
  // add lowercase words/phrases you want auto-flagged
];

async function warn(msg, args, isAdminSender) {
  if (!isAdminSender) return msg.reply("Only admins can warn players.");
  const targetId = await firstMention(msg);
  if (!targetId) return msg.reply(`Usage: ${config.PREFIX}warn @player [reason]`);
  const reason = args.slice(1).join(" ") || "No reason given";

  const warnings = db.read("warnings");
  if (!warnings[targetId]) warnings[targetId] = [];
  warnings[targetId].push({ reason, at: new Date().toISOString(), by: msg.author || msg.from });
  db.write("warnings", warnings);

  const count = warnings[targetId].length;
  let reply = `⚠️ ${mentionText(targetId)} warned (${count}). Reason: ${reason}`;

  if (config.MAX_WARNINGS_BEFORE_AUTOKICK && count >= config.MAX_WARNINGS_BEFORE_AUTOKICK) {
    const kicked = await tryKick(msg, targetId);
    reply += kicked
      ? `\n🚫 Reached ${count} warnings — auto-removed from the group.`
      : `\n🚫 Reached ${count} warnings — auto-kick failed (bot may not be a group admin).`;
  }

  return msg.reply(reply, undefined, { mentions: [targetId] });
}

async function warningsList(msg) {
  const targetId = (await firstMention(msg)) || (msg.author || msg.from);
  const warnings = db.read("warnings");
  const list = warnings[targetId] || [];
  if (list.length === 0) return msg.reply("No warnings on record.");
  const lines = list.map((w, i) => `${i + 1}. ${w.reason} (${new Date(w.at).toLocaleDateString()})`);
  return msg.reply(`⚠️ Warnings (${list.length}):\n${lines.join("\n")}`);
}

async function clearWarnings(msg, isAdminSender) {
  if (!isAdminSender) return msg.reply("Only admins can clear warnings.");
  const targetId = await firstMention(msg);
  if (!targetId) return msg.reply(`Usage: ${config.PREFIX}clearwarnings @player`);
  const warnings = db.read("warnings");
  warnings[targetId] = [];
  db.write("warnings", warnings);
  return msg.reply(`✅ Cleared warnings for ${mentionText(targetId)}.`);
}

async function tryKick(msg, targetId) {
  try {
    const chat = await msg.getChat();
    if (!chat.isGroup) return false;
    await chat.removeParticipants([targetId]);
    return true;
  } catch (err) {
    console.error("[moderation] kick failed:", err.message);
    return false;
  }
}

async function kick(msg, isAdminSender) {
  if (!isAdminSender) return msg.reply("Only admins can remove players.");
  const targetId = await firstMention(msg);
  if (!targetId) return msg.reply(`Usage: ${config.PREFIX}kick @player`);
  const ok = await tryKick(msg, targetId);
  return msg.reply(
    ok
      ? `🚫 Removed ${mentionText(targetId)} from the group.`
      : `Couldn't remove them — make sure the bot's WhatsApp account is a group admin.`
  );
}

/**
 * WhatsApp has no real "mute" concept for individual users. We simulate
 * it by recording a mute window and silently deleting that user's
 * messages for the duration (handled in index.js's message listener).
 */
async function mute(msg, args, isAdminSender) {
  if (!isAdminSender) return msg.reply("Only admins can mute players.");
  const targetId = await firstMention(msg);
  const minutesArg = args.find((a) => /^\d+$/.test(a));
  const minutes = minutesArg ? parseInt(minutesArg, 10) : 30;
  if (!targetId) return msg.reply(`Usage: ${config.PREFIX}mute @player [minutes] (default 30)`);

  const mutes = db.read("mutes");
  mutes[targetId] = { until: Date.now() + minutes * 60 * 1000 };
  db.write("mutes", mutes);

  return msg.reply(`🔇 Muted ${mentionText(targetId)} for ${minutes} minutes. Their messages will be auto-deleted.`);
}

async function unmute(msg, isAdminSender) {
  if (!isAdminSender) return msg.reply("Only admins can unmute players.");
  const targetId = await firstMention(msg);
  if (!targetId) return msg.reply(`Usage: ${config.PREFIX}unmute @player`);
  const mutes = db.read("mutes");
  delete mutes[targetId];
  db.write("mutes", mutes);
  return msg.reply(`🔊 Unmuted ${mentionText(targetId)}.`);
}

function isMuted(id) {
  const mutes = db.read("mutes");
  const m = mutes[id];
  if (!m) return false;
  if (Date.now() > m.until) return false;
  return true;
}

async function announce(msg, args) {
  const text = args.join(" ").trim();
  if (!text) return msg.reply(`Usage: ${config.PREFIX}announce <message>`);
  const chat = await msg.getChat();
  return chat.sendMessage(`📢 *Announcement*\n${text}`);
}

/**
 * Passive check run on every group message (not just commands).
 * Returns true if the message was flagged/handled.
 */
async function autoModerate(msg) {
  if (BANNED_WORDS.length === 0) return false;
  const lower = (msg.body || "").toLowerCase();
  const hit = BANNED_WORDS.find((w) => lower.includes(w));
  if (!hit) return false;

  try {
    await msg.delete(true);
    const chat = await msg.getChat();
    await chat.sendMessage(`🤖 A message was removed for violating community guidelines.`);
  } catch (err) {
    console.error("[automod] failed to delete message:", err.message);
  }
  return true;
}

module.exports = {
  warn,
  warningsList,
  clearWarnings,
  kick,
  mute,
  unmute,
  isMuted,
  announce,
  autoModerate,
};
