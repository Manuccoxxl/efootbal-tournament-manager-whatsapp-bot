/**
 * Central configuration.
 * Edit ADMINS with the full WhatsApp IDs of your server admins,
 * e.g. "15551234567@c.us". You can find a user's ID by having the
 * bot log msg.author / msg.from for a message they send (see index.js).
 */

module.exports = {
  // Command prefix
  PREFIX: "!",

  // WhatsApp IDs (not phone numbers with + or spaces) of bot admins.
  // These users can use moderation / tournament-admin / economy-admin commands.
  ADMINS: [
    // "15551234567@c.us"
  ],

  // Divisions used by the ranking system, ordered lowest -> highest.
  // A player's rating determines their division.
  DIVISIONS: [
    { name: "Division 5", minRating: 0 },
    { name: "Division 4", minRating: 1000 },
    { name: "Division 3", minRating: 1150 },
    { name: "Division 2", minRating: 1300 },
    { name: "Division 1", minRating: 1500 },
    { name: "Elite", minRating: 1700 },
  ],

  STARTING_RATING: 1000,
  RATING_WIN: 25,
  RATING_LOSS: -20,
  RATING_DRAW: 2,

  // Leveling
  XP_PER_WIN: 30,
  XP_PER_LOSS: 10,
  XP_PER_DRAW: 15,
  XP_PER_LEVEL: 100, // flat curve; tweak to taste

  // Economy
  DAILY_COINS: 50,
  COINS_PER_WIN: 20,

  // Moderation
  MAX_WARNINGS_BEFORE_AUTOKICK: 3, // set to 0 to disable auto-kick

  // Matchmaking
  MATCHMAKING_RATING_RANGE: 150, // only auto-pair players within this rating gap

  // Web dashboard - read/write view of the data/ JSON files.
  // No login is built in, so keep HOST as "127.0.0.1" (localhost-only)
  // unless you put your own auth/reverse-proxy in front of it. Changing
  // this to "0.0.0.0" exposes editable bot data to anyone who can reach
  // the port.
  DASHBOARD: {
    ENABLED: true,
    PORT: parseInt(process.env.DASHBOARD_PORT, 10) || 3000,
    // Bare Node/PM2: leave as 127.0.0.1 (localhost-only, safest default).
    // Docker: set DASHBOARD_HOST=0.0.0.0 in the env (docker-compose.yml
    // already does this) - binding to 127.0.0.1 *inside* a container makes
    // it unreachable through Docker's port mapping even if the mapping
    // itself is restricted to the host's loopback. The host-side exposure
    // is controlled by the "ports:" line in docker-compose.yml instead.
    HOST: process.env.DASHBOARD_HOST || "127.0.0.1",
  },
};
