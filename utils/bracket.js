/**
 * Builds a single-elimination bracket from a list of player IDs.
 * Pads with "BYE" so the field is a power of two; BYE opponents
 * auto-advance the real player when the bracket is generated.
 *
 * Returns { rounds: [ [ {p1, p2, winner, score}, ... ], ... ] }
 */
function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateBracket(playerIds) {
  const size = nextPowerOfTwo(playerIds.length);
  const shuffled = shuffle(playerIds);
  while (shuffled.length < size) shuffled.push(null); // null = BYE

  const round1 = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const p1 = shuffled[i];
    const p2 = shuffled[i + 1];
    let winner = null;
    if (p1 && !p2) winner = p1;
    if (p2 && !p1) winner = p2;
    round1.push({ p1, p2, winner, score: winner ? "BYE" : null });
  }

  const rounds = [round1];
  let matchesInRound = round1.length;
  while (matchesInRound > 1) {
    matchesInRound = matchesInRound / 2;
    const emptyRound = Array.from({ length: matchesInRound }, () => ({
      p1: null,
      p2: null,
      winner: null,
      score: null,
    }));
    rounds.push(emptyRound);
  }

  propagateByes(rounds);
  return { rounds };
}

/**
 * Pushes auto-advanced BYE winners into the next round's slots.
 */
function propagateByes(rounds) {
  for (let r = 0; r < rounds.length - 1; r++) {
    const round = rounds[r];
    const next = rounds[r + 1];
    for (let i = 0; i < round.length; i++) {
      const match = round[i];
      if (match.winner) {
        const nextMatch = next[Math.floor(i / 2)];
        if (i % 2 === 0) nextMatch.p1 = match.winner;
        else nextMatch.p2 = match.winner;
      }
    }
  }
}

/**
 * Records a winner for rounds[roundIndex][matchIndex] and propagates
 * them into the next round. Returns false if the match slot is invalid
 * or not ready to be played (missing a player).
 */
function recordResult(bracket, roundIndex, matchIndex, winnerId, scoreLabel) {
  const round = bracket.rounds[roundIndex];
  if (!round || !round[matchIndex]) return false;
  const match = round[matchIndex];
  if (!match.p1 || !match.p2) return false;
  if (winnerId !== match.p1 && winnerId !== match.p2) return false;

  match.winner = winnerId;
  match.score = scoreLabel || null;

  const nextRound = bracket.rounds[roundIndex + 1];
  if (nextRound) {
    const nextMatch = nextRound[Math.floor(matchIndex / 2)];
    if (matchIndex % 2 === 0) nextMatch.p1 = winnerId;
    else nextMatch.p2 = winnerId;
  }
  return true;
}

function isComplete(bracket) {
  const finalRound = bracket.rounds[bracket.rounds.length - 1];
  return finalRound.length === 1 && !!finalRound[0].winner;
}

function champion(bracket) {
  if (!isComplete(bracket)) return null;
  return bracket.rounds[bracket.rounds.length - 1][0].winner;
}

module.exports = { generateBracket, recordResult, isComplete, champion };
