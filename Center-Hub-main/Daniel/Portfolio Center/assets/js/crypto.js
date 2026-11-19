// Encryption, PIN wrapping, and recovery functions
const enc = new TextEncoder(),
  dec = new TextDecoder();
function b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function unb64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function rand(n = 32) {
  let a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}
function hex(a) {
  return [...a].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function randomCode() {
  let a = hex(rand(16)).toUpperCase();
  return a.match(/.{1,4}/g).join("-");
}
async function derive(secret, salt) {
  let base = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
async function encrypt(key, data) {
  let iv = rand(12),
    cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { iv: b64(iv), data: b64(cipher) };
}
async function decrypt(key, box) {
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(box.iv) },
    key,
    unb64(box.data),
  );
}
async function wrapKey(wrappingKey, raw) {
  return encrypt(wrappingKey, raw);
}
async function unwrapKey(wk, box) {
  return decrypt(wk, box);
}
const recoveryWords = [
  "amber",
  "anchor",
  "apricot",
  "arrow",
  "atlas",
  "autumn",
  "badge",
  "bamboo",
  "beacon",
  "berry",
  "birch",
  "blossom",
  "blue",
  "brave",
  "bridge",
  "cactus",
  "candle",
  "canyon",
  "cedar",
  "cherry",
  "cloud",
  "cobalt",
  "comet",
  "coral",
  "crystal",
  "dawn",
  "delta",
  "dolphin",
  "dragon",
  "dream",
  "ember",
  "falcon",
  "fern",
  "flame",
  "forest",
  "frost",
  "galaxy",
  "garden",
  "glacier",
  "gold",
  "harbor",
  "hazel",
  "horizon",
  "indigo",
  "island",
  "jasmine",
  "jungle",
  "lantern",
  "lemon",
  "lotus",
  "maple",
  "meadow",
  "meteor",
  "mint",
  "moon",
  "morning",
  "nectar",
  "ocean",
  "olive",
  "orchid",
  "pebble",
  "pine",
  "planet",
  "plum",
  "raven",
  "river",
  "ruby",
  "saffron",
  "shadow",
  "silver",
  "sky",
  "spark",
  "spruce",
  "star",
  "stone",
  "storm",
  "sunrise",
  "thunder",
  "timber",
  "violet",
  "willow",
  "winter",
];
function makePhrase() {
  return Array.from(
    { length: 12 },
    () =>
      recoveryWords[
        crypto.getRandomValues(new Uint32Array(1))[0] % recoveryWords.length
      ],
  ).join(" ");
}
function cleanPhrase(v) {
  return v.toLowerCase().trim().replace(/\s+/g, " ");
}
function downloadText(filename, text) {
  let blob = new Blob([text], { type: "text/plain;charset=utf-8" }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function recoveryBundle(key, phrase) {
  return `PORTFOLIO VAULT RECOVERY\nCreated: ${new Date().toISOString()}\n\nRECOVERY KEY:\n${key}\n\nRECOVERY PHRASE (12 words):\n${phrase}\n\nKeep this file offline and private. Anyone with either recovery credential can reset your vault PIN. If you lose both credentials and your PIN, encrypted files cannot be recovered.\n`;
}
async function setup(pin) {
  let raw = rand(32),
    recovery = randomCode(),
    phrase = makePhrase(),
    pinSalt = rand(16),
    recSalt = rand(16),
    phraseSalt = rand(16),
    pinKey = await derive(pin, pinSalt),
    recKey = await derive(recovery, recSalt),
    phraseKey = await derive(cleanPhrase(phrase), phraseSalt);
  let pinWrap = await wrapKey(pinKey, raw),
    recWrap = await wrapKey(recKey, raw),
    phraseWrap = await wrapKey(phraseKey, raw);
  meta = {
    pinSalt: b64(pinSalt),
    recSalt: b64(recSalt),
    phraseSalt: b64(phraseSalt),
    pinWrap,
    recWrap,
    phraseWrap,
    created: Date.now(),
  };
  localStorage.setItem(META, JSON.stringify(meta));
  masterKey = await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  return { recovery, phrase };
}
async function recover(code, newPin) {
  let m = JSON.parse(localStorage.getItem(META)),
    raw;
  if (code.trim().includes(" ")) {
    if (!m.phraseWrap || !m.phraseSalt)
      throw Error("Phrase recovery unavailable");
    let k = await derive(cleanPhrase(code), unb64(m.phraseSalt));
    raw = await unwrapKey(k, m.phraseWrap);
  } else {
    let normalized = code
      .replace(/-/g, "")
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join("-");
    let k = await derive(normalized, unb64(m.recSalt));
    raw = await unwrapKey(k, m.recWrap);
  }
  let newSalt = rand(16),
    newKey = await derive(newPin, newSalt);
  m.pinSalt = b64(newSalt);
  m.pinWrap = await wrapKey(newKey, raw);
  localStorage.setItem(META, JSON.stringify(m));
  meta = m;
  masterKey = await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}
async function unlock(pin) {
  let m = JSON.parse(localStorage.getItem(META));
  let k = await derive(pin, unb64(m.pinSalt));
  let raw = await unwrapKey(k, m.pinWrap);
  masterKey = await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  meta = m;
}
