const db = require("../utils/db");
const config = require("../config");
const ranking = require("../utils/ranking");
const { displayName, mentionText, firstMention } = require("../utils/format");

function ensureRegistered(players, id) {
  return !!players[id];
}

/**
 * !queue - join the matchmaking queue. If someone else in a compatible
 * rating range is already waiting, auto-pair them into a pending match.
 */
async function joinQueue(msg) {
  const senderId = msg.author || msg.from;
  const players = db.read("players");
  if (!ensureRegistered(players, senderId)) {
    return msg.reply(`Register first with ${config.PREFIX}register <your EA/PSN ID>.`);
  }

  const queue = db.read("queue");
  if (queue[senderId]) {
    return msg.reply("You're already in the queue.");
  }

  const me = players[senderId];
  const waitingIds = Object.keys(queue).filter((id) => id !== senderId);

  const opponentId = waitingIds.find((id) => {
    const opp = players[id];
    return opp && Math.abs(opp.rating - me.rating) <= config.MATCHMAKING_RATING_RANGE;
  });

  if (opponentId) {
    delete queue[opponentId];
    db.write("queue", queue);
    const matchId = createPendingMatch(senderId, opponentId);
    return msg.reply(
      `⚔️ Match found! *${me.ign}* vs *${players[opponentId].ign}*\n` +
        `Match ID: ${matchId}\n` +
        `Play it out, then either player reports with:\n` +
        `${config.PREFIX}reportscore ${matchId} <yourscore>-<theirscore>`
    );
  }

  queue[senderId] = { joinedAt: new Date().toISOString(), rating: me.rating };
  db.write("queue", queue);
  return msg.reply(`🔎 Added to matchmaking queue at ${me.rating} rating. We'll pair you when an opponent is found.`);
}

async function leaveQueue(msg) {
  const senderId = msg.author || msg.from;
  const queue = db.read("queue");
  if (!queue[senderId]) {
    return msg.reply("You're not in the queue.");
  }
  delete queue[senderId];
  db.write("queue", queue);
  return msg.reply("Left the matchmaking queue.");
}

async function queueStatus(msg) {
  const queue = db.read("queue");
  const players = db.read("players");
  const waiting = Object.keys(queue);
  if (waiting.length === 0) return msg.reply("Queue is empty.");
  const lines = waiting.map((id) => `- ${players[id] ? players[id].ign : id} (${queue[id].rating})`);
  return msg.reply(`🔎 Currently in queue:\n${lines.join("\n")}`);
}

function createPendingMatch(playerA, playerB) {
  const matches = db.read("matches");
  const matchId = "M" + Date.now().toString(36).toUpperCase();
  matches[matchId] = {
    playerA,
    playerB,
    status: "pending", // pending -> reported -> confirmed
    reportedBy: null,
    reportedScore: null, // { a, b } from playerA perspective
    createdAt: new Date().toISOString(),
  };
  db.write("matches", matches);
  return matchId;
}

/**
 * !reportscore <matchId> <yourscore>-<theirscore>
 * First report sets it to "reported"; the other player (or an admin)
 * must !confirm <matchId> to finalize it and apply rating/XP/coins changes.
 */
async function reportScore(msg, args) {
  const senderId = msg.author || msg.from;
  const [matchId, scoreArg] = args;
  if (!matchId || !scoreArg || !/^\d+-\d+$/.test(scoreArg)) {
    return msg.reply(`Usage: ${config.PREFIX}reportscore <matchId> <yourscore>-<theirscore>\nExample: ${config.PREFIX}reportscore M1A2B3 3-1`);
  }

  const matches = db.read("matches");
  const match = matches[matchId];
  if (!match) return msg.reply("No match with that ID.");
  if (match.status === "confirmed") return msg.reply("That match is already confirmed.");
  if (senderId !== match.playerA && senderId !== match.playerB) {
    return msg.reply("You're not part of this match.");
  }

  const [myScore, theirScore] = scoreArg.split("-").map(Number);
  const isPlayerA = senderId === match.playerA;
  const scoreFromAPerspective = isPlayerA
    ? { a: myScore, b: theirScore }
    : { a: theirScore, b: myScore };

  match.status = "reported";
  match.reportedBy = senderId;
  match.reportedScore = scoreFromAPerspective;
  db.write("matches", matches);

  const otherPlayer = isPlayerA ? match.playerB : match.playerA;
  return msg.reply(
    `📝 Score reported: ${scoreArg}. Waiting on ${mentionText(otherPlayer)} (or an admin) to ${config.PREFIX}confirm ${matchId}.`
  );
}

/**
 * !confirm <matchId> - confirms a reported score. Either the opponent
 * who didn't report, or an admin, can confirm.
 */
async function confirmScore(msg, args, isAdminSender) {
  const senderId = msg.author || msg.from;
  const [matchId] = args;
  if (!matchId) return msg.reply(`Usage: ${config.PREFIX}confirm <matchId>`);

  const matches = db.read("matches");
  const match = matches[matchId];
  if (!match) return msg.reply("No match with that ID.");
  if (match.status !== "reported") return msg.reply("This match has no pending score to confirm.");

  const isParticipant = senderId === match.playerA || senderId === match.playerB;
  const isTheReporter = senderId === match.reportedBy;
  if (isTheReporter && !isAdminSender) {
    return msg.reply("The score reporter can't confirm their own report. Ask your opponent or an admin.");
  }
  if (!isParticipant && !isAdminSender) {
    return msg.reply("Only the other player or an admin can confirm this.");
  }

  const players = db.read("players");
  const pA = players[match.playerA];
  const pB = players[match.playerB];
  if (!pA || !pB) return msg.reply("One of the players is no longer registered.");

  const { a, b } = match.reportedScore;
  const result = a > b ? "win" : a < b ? "loss" : "draw";
  ranking.applyResult(pA, pB, result);
  db.write("players", players);

  match.status = "confirmed";
  db.write("matches", matches);

  return msg.reply(
    `✅ Match confirmed: *${pA.ign}* ${a}-${b} *${pB.ign}*\n` +
      `Ratings updated: ${pA.ign} → ${pA.rating} | ${pB.ign} → ${pB.rating}`
  );
}

module.exports = { joinQueue, leaveQueue, queueStatus, reportScore, confirmScore };
