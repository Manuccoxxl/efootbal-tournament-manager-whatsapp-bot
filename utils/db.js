const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

const FILES = {
  players: "players.json",
  tournaments: "tournaments.json",
  queue: "queue.json",
  economy: "economy.json",
  warnings: "warnings.json",
  matches: "matches.json",
  mutes: "mutes.json",
};

function ensureFile(name) {
  const file = path.join(DATA_DIR, FILES[name]);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "{}", "utf8");
  }
  return file;
}

function read(name) {
  const file = ensureFile(name);
  try {
    const raw = fs.readFileSync(file, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    console.error(`[db] Failed to read ${name}, resetting to {}.`, err);
    return {};
  }
}

function write(name, data) {
  const file = ensureFile(name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

module.exports = { read, write, FILES };
