const db = require("./db");

/**
 * Returns a display name for a WhatsApp ID: the player's registered
 * EA/PSN ID if they've registered, otherwise their raw phone number.
 */
function displayName(id) {
  const players = db.read("players");
  const p = players[id];
  if (p && p.ign) return p.ign;
  return id.split("@")[0];
}

function mentionText(id) {
  return `@${id.split("@")[0]}`;
}

/**
 * Extracts the first mentioned user's ID from a message, or null.
 */
async function firstMention(msg) {
  const mentions = await msg.getMentions();
  if (!mentions || mentions.length === 0) return null;
  return mentions[0].id._serialized;
}

module.exports = { displayName, mentionText, firstMention };
