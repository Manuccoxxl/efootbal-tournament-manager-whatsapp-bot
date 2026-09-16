const config = require("../config");

/**
 * Whether the sender is a bot-admin as defined in config.js.
 */
function isBotAdmin(senderId) {
  return config.ADMINS.includes(senderId);
}

/**
 * Whether the sender is an admin of the WhatsApp group the message came from.
 * Falls back to false for DMs or if group metadata can't be read.
 */
async function isGroupAdmin(msg) {
  try {
    const chat = await msg.getChat();
    if (!chat.isGroup) return false;
    const participant = chat.participants.find((p) => p.id._serialized === msg.author || p.id._serialized === msg.from);
    return !!participant && (participant.isAdmin || participant.isSuperAdmin);
  } catch (err) {
    return false;
  }
}

/**
 * Combined check: bot-admin (config) OR WhatsApp group admin.
 */
async function isAdmin(msg) {
  const senderId = msg.author || msg.from;
  if (isBotAdmin(senderId)) return true;
  return isGroupAdmin(msg);
}

module.exports = { isBotAdmin, isGroupAdmin, isAdmin };
