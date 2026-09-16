const config = require("../config");

async function help(msg) {
  const p = config.PREFIX;
  const text = `
🤖 *eFootball Server Bot*

*Registration*
${p}register <EA/PSN ID> — sign up
${p}rename <new ID> — change your registered ID
${p}profile [@player] — view stats

*Ranking & Leaderboards*
${p}leaderboard [rating|level|mvp|coins]

*Matchmaking*
${p}queue — join matchmaking
${p}leavequeue
${p}queuelist — see who's waiting
${p}reportscore <matchId> <you-them> — report a casual match result
${p}confirm <matchId> — confirm a reported result

*Tournaments*
${p}tournament list
${p}tournament join <name>
${p}tournament bracket <name>
${p}tournament standings <name>
*(admin)* ${p}tournament create <name> [max]
*(admin)* ${p}tournament start <name>
*(admin)* ${p}tournament report <name> <round> <match> <score>

*Economy*
${p}balance [@player]
${p}daily — claim daily coins
*(admin)* ${p}give @player <amount>

*MVP*
*(admin)* ${p}mvp @player

*Moderation (admin only)*
${p}warn @player [reason]
${p}warnings [@player]
${p}clearwarnings @player
${p}kick @player
${p}mute @player [minutes]
${p}unmute @player
${p}announce <message>
`.trim();

  return msg.reply(text);
}

module.exports = { help };
