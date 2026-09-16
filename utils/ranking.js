const config = require("../config");

function divisionForRating(rating) {
  let current = config.DIVISIONS[0];
  for (const d of config.DIVISIONS) {
    if (rating >= d.minRating) current = d;
  }
  return current.name;
}

function levelForXp(xp) {
  return Math.floor(xp / config.XP_PER_LEVEL) + 1;
}

function xpToNextLevel(xp) {
  const currentLevelFloor = (levelForXp(xp) - 1) * config.XP_PER_LEVEL;
  return currentLevelFloor + config.XP_PER_LEVEL - xp;
}

/**
 * Applies the result of a match to both players' rating/XP/W-L record in place.
 * result is from player A's perspective: "win" | "loss" | "draw"
 */
function applyResult(playerA, playerB, result) {
  if (result === "win") {
    playerA.rating += config.RATING_WIN;
    playerB.rating += config.RATING_LOSS;
    playerA.wins += 1;
    playerB.losses += 1;
    playerA.xp += config.XP_PER_WIN;
    playerB.xp += config.XP_PER_LOSS;
    playerA.coins = (playerA.coins || 0) + config.COINS_PER_WIN;
  } else if (result === "loss") {
    playerA.rating += config.RATING_LOSS;
    playerB.rating += config.RATING_WIN;
    playerA.losses += 1;
    playerB.wins += 1;
    playerA.xp += config.XP_PER_LOSS;
    playerB.xp += config.XP_PER_WIN;
    playerB.coins = (playerB.coins || 0) + config.COINS_PER_WIN;
  } else {
    playerA.rating += config.RATING_DRAW;
    playerB.rating += config.RATING_DRAW;
    playerA.draws += 1;
    playerB.draws += 1;
    playerA.xp += config.XP_PER_DRAW;
    playerB.xp += config.XP_PER_DRAW;
  }
  playerA.rating = Math.max(0, playerA.rating);
  playerB.rating = Math.max(0, playerB.rating);
}

module.exports = { divisionForRating, levelForXp, xpToNextLevel, applyResult };
