import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, X, Trash2, Gamepad2, Upload, ArrowRight, Check, Trophy, Image as ImageIcon, Dices, Download, Star, Layers, LogOut, Mail, MoreHorizontal, SlidersHorizontal, ChevronLeft, Library, LayoutGrid, ChevronDown, ChevronsUpDown, ChevronsDownUp, Tags } from "lucide-react";
import Papa from "papaparse";
import { supabase, supabaseConfigured } from "./supabaseClient.js";
import { fetchAllGames, pushChanges } from "./cloud.js";

const STATUS = {
  backlog: { label: "À faire", color: "#7A7264" },
  playing: { label: "En cours", color: "#D4AF37" },
  done: { label: "Terminé", color: "#7FA06A" },
  dropped: { label: "Abandonné", color: "#A65B4C" },
};
const STATUS_ORDER = ["backlog", "playing", "done", "dropped"];

const CONSOLE_PRESETS = [
  "PS5", "PS4", "PS3", "PS2", "PS1", "PSP", "Nintendo Switch", "Nintendo Switch 2", "Wii", "Wii U",
  "Xbox Series X|S", "Xbox One", "PC", "Steam Deck", "3DS", "DS", "GBA", "Rétro",
];

const SPINE_PALETTE = ["#B33A3A", "#3A5FB3", "#3AA65C", "#B38A3A", "#7B5FB3", "#3AA6A0", "#B3563A", "#5F8AB3", "#A6763A", "#3AB38F"];

const GENRES = [
  "Action", "Action-Aventure", "Action-RPG", "Aventure", "Combat", "Course", "Horreur",
  "Plateforme", "Puzzle", "Roguelike", "RPG", "Simulation", "Sport", "Stratégie", "Tir (FPS / TPS)",
].sort((a, b) => a.localeCompare(b, "fr"));

const MODES = ["Solo", "Multijoueur", "Coop"];
const PEGI_OPTIONS = ["PEGI 3", "PEGI 7", "PEGI 12", "PEGI 16", "PEGI 18"];

function consoleColor(name) {
  if (!name) return "#5A5347";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return SPINE_PALETTE[Math.abs(hash) % SPINE_PALETTE.length];
}

// Styles inspirés des vrais boîtiers (couleur de tranche + épaisseur), pas les logos officiels
// Dimensions réelles des boîtiers vendus en France/PAL (mm), ramenées à l'échelle
const CONSOLE_STYLES = {
  ps5: { bg: "linear-gradient(180deg, #EEF0F3, #D6DCE2)", text: "#14171C", label: "PS5", width: 20, height: 289, boxW: 101, boxH: 128, boxSpine: 9 },
  ps4: { bg: "linear-gradient(180deg, #0E2E72, #0A2258)", text: "#FFFFFF", label: "PS4", width: 20, height: 289, boxW: 101, boxH: 128, boxSpine: 9 },
  ps3: { bg: "linear-gradient(180deg, #232326, #131315)", text: "#E6E6E6", label: "PS3", width: 20, height: 289, boxW: 101, boxH: 128, boxSpine: 9 },
  ps2: { bg: "linear-gradient(180deg, #1747B3, #123790)", text: "#FFFFFF", label: "PS2", width: 25, height: 323, boxW: 101, boxH: 143, boxSpine: 11 },
  ps1: { bg: "linear-gradient(180deg, #2A2A2C, #17171A)", text: "#D8D8D8", label: "PS1", width: 17, height: 235, boxW: 93, boxH: 104, boxSpine: 8 },
  psvita: { bg: "linear-gradient(180deg, #274BA6, #1D3A85)", text: "#FFFFFF", label: "VITA", width: 24, height: 230, boxW: 82, boxH: 101, boxSpine: 11 },
  xbox: { bg: "linear-gradient(180deg, #14933E, #0E7A30)", text: "#FFFFFF", label: "XBOX", width: 20, height: 289, boxW: 101, boxH: 128, boxSpine: 9 },
  switch: { bg: "linear-gradient(180deg, #EE0F26, #C90A1D)", text: "#FFFFFF", label: "SWITCH", width: 15, height: 289, boxW: 80, boxH: 128, boxSpine: 7 },
  wiiu: { bg: "linear-gradient(180deg, #F5F5F5, #E2E2E2)", text: "#14171C", label: "WII U", width: 25, height: 323, boxW: 101, boxH: 143, boxSpine: 11 },
  wii: { bg: "linear-gradient(180deg, #FDFDFD, #E8E8E8)", text: "#14171C", label: "WII", width: 25, height: 323, boxW: 101, boxH: 143, boxSpine: 11 },
  n3ds: { bg: "linear-gradient(180deg, #D2161F, #B10E16)", text: "#FFFFFF", label: "3DS", width: 21, height: 231, boxW: 93, boxH: 102, boxSpine: 9 },
  ds: { bg: "linear-gradient(180deg, #0B7BC4, #085D96)", text: "#FFFFFF", label: "DS", width: 32, height: 221, boxW: 101, boxH: 98, boxSpine: 14 },
  psp: { bg: "linear-gradient(180deg, #232326, #131315)", text: "#E6E6E6", label: "PSP", width: 25, height: 323, boxW: 101, boxH: 143, boxSpine: 11 },
  gba: { bg: "linear-gradient(180deg, #5A2E9E, #431F79)", text: "#FFFFFF", label: "GBA", width: 34, height: 219, boxW: 95, boxH: 97, boxSpine: 15 },
  pc: { bg: "linear-gradient(180deg, #2B2F33, #1C1F22)", text: "#E8E6E0", label: "PC", width: 20, height: 289, boxW: 101, boxH: 128, boxSpine: 9 },
};

const PLAYSTATION_FAMILIES = ["ps1", "ps2", "ps3", "ps4", "ps5", "psvita"];

function consoleFamily(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("switch")) return "switch";
  if (n.includes("vita")) return "psvita";
  if (n.includes("ps5") || n.includes("playstation 5")) return "ps5";
  if (n.includes("ps4") || n.includes("playstation 4")) return "ps4";
  if (n === "ps3" || n.includes("playstation 3")) return "ps3";
  if (n === "ps2" || n.includes("playstation 2")) return "ps2";
  if (n === "ps1" || n === "psx" || n === "psone" || n.includes("playstation 1") || n.includes("ps 1")) return "ps1";
  if (n.includes("wii u")) return "wiiu";
  if (n === "wii" || n.includes("wii")) return "wii";
  if (n.includes("3ds")) return "n3ds";
  if (n === "ds" || n.includes("nintendo ds") || n.includes("ds lite") || n.includes("dsi")) return "ds";
  if (n.includes("psp")) return "psp";
  if (n.includes("gba") || n.includes("game boy advance")) return "gba";
  if (n.includes("xbox")) return "xbox";
  if (n.includes("pc") || n.includes("steam")) return "pc";
  return null;
}

function getSpineStyle(name) {
  const fam = consoleFamily(name);
  if (fam && CONSOLE_STYLES[fam]) return { boxW: 101, boxH: 128, boxSpine: 9, ...CONSOLE_STYLES[fam] };
  return { bg: consoleColor(name), text: "#FFFFFF", label: "", width: 25, height: 289, boxW: 101, boxH: 128, boxSpine: 9 };
}

// Constructeurs, dans l'ordre d'affichage de la page d'accueil.
const MAKERS = ["Sony", "Nintendo", "Microsoft", "Sega", "PC", "Autres"];

// Consoles par constructeur ; l'affichage va de la plus récente à la plus ancienne (année de 1re sortie).
// `re` reconnaît les écritures courantes (en minuscules) : "PS5", "playstation 5", "GBA SP"…
const CONSOLE_CATALOG = [
  { key: "ps1", label: "PlayStation", maker: "Sony", year: 1994, re: /\bps ?1\b|\bpsx\b|\bps ?one\b|playstation ?1\b|^playstation$/ },
  { key: "ps2", label: "PlayStation 2", maker: "Sony", year: 2000, re: /\bps ?2\b|playstation ?2/ },
  { key: "psp", label: "PSP", maker: "Sony", year: 2004, re: /\bpsp\b/ },
  { key: "ps3", label: "PlayStation 3", maker: "Sony", year: 2006, re: /\bps ?3\b|playstation ?3/ },
  { key: "psvita", label: "PS Vita", maker: "Sony", year: 2011, re: /vita/ },
  { key: "ps4", label: "PlayStation 4", maker: "Sony", year: 2013, re: /\bps ?4\b|playstation ?4/ },
  { key: "ps5", label: "PlayStation 5", maker: "Sony", year: 2020, re: /\bps ?5\b|playstation ?5/ },
  { key: "nes", label: "NES", maker: "Nintendo", year: 1983, re: /^nes$|nintendo entertainment/ },
  { key: "gb", label: "Game Boy", maker: "Nintendo", year: 1989, re: /^(game ?boy|gb)$|game ?boy (classic|pocket)/ },
  { key: "snes", label: "Super Nintendo", maker: "Nintendo", year: 1990, re: /\bsnes\b|super ?(nintendo|nes)/ },
  { key: "n64", label: "Nintendo 64", maker: "Nintendo", year: 1996, re: /\bn64\b|nintendo ?64/ },
  { key: "gbc", label: "Game Boy Color", maker: "Nintendo", year: 1998, re: /\bgbc\b|game ?boy color/ },
  { key: "gamecube", label: "GameCube", maker: "Nintendo", year: 2001, re: /game ?cube|\bngc\b|^gc$/ },
  { key: "gba", label: "Game Boy Advance", maker: "Nintendo", year: 2001, re: /\bgba\b|game ?boy advance/ },
  { key: "ds", label: "Nintendo DS", maker: "Nintendo", year: 2004, re: /^ds$|\bnds\b|nintendo ds\b|\bds ?lite\b|\bdsi\b/ },
  { key: "wii", label: "Wii", maker: "Nintendo", year: 2006, re: /^wii$|^nintendo wii$/ },
  { key: "3ds", label: "Nintendo 3DS", maker: "Nintendo", year: 2011, re: /[23]ds/ },
  { key: "wiiu", label: "Wii U", maker: "Nintendo", year: 2012, re: /wii ?u/ },
  { key: "switch", label: "Nintendo Switch", maker: "Nintendo", year: 2017, re: /switch(?! ?2)/ },
  { key: "switch2", label: "Nintendo Switch 2", maker: "Nintendo", year: 2025, re: /switch ?2/ },
  { key: "xbox", label: "Xbox", maker: "Microsoft", year: 2001, re: /^xbox( ?(original|classic))?$/ },
  { key: "x360", label: "Xbox 360", maker: "Microsoft", year: 2005, re: /360/ },
  { key: "xone", label: "Xbox One", maker: "Microsoft", year: 2013, re: /xbox ?one|^xone$/ },
  { key: "xseries", label: "Xbox Series X|S", maker: "Microsoft", year: 2020, re: /series|\bxsx\b|\bxss\b/ },
  { key: "mastersystem", label: "Master System", maker: "Sega", year: 1985, re: /master ?system/ },
  { key: "megadrive", label: "Mega Drive", maker: "Sega", year: 1988, re: /mega ?drive|genesis/ },
  { key: "saturn", label: "Saturn", maker: "Sega", year: 1994, re: /saturn/ },
  { key: "dreamcast", label: "Dreamcast", maker: "Sega", year: 1998, re: /dreamcast/ },
  { key: "pc", label: "PC", maker: "PC", year: 1, re: /\bpc\b|steam|windows/ },
];

function consoleInfo(name) {
  const raw = (name || "").trim();
  if (!raw) return { key: "none", label: "Sans console", maker: "Autres", year: -1 };
  const n = raw.toLowerCase();
  const hit = CONSOLE_CATALOG.find((c) => c.re.test(n));
  return hit || { key: "other:" + n, label: raw, maker: "Autres", year: 0 };
}

function compareConsoleInfo(a, b) {
  const ma = MAKERS.indexOf(a.maker);
  const mb = MAKERS.indexOf(b.maker);
  if (ma !== mb) return ma - mb;
  if (a.year !== b.year) return b.year - a.year; // plus récent d'abord
  return a.label.localeCompare(b.label, "fr");
}

// Liste de jeux -> [{ maker, count, consoles: [{ key, label, games }] }] : constructeurs dans l'ordre fixé, consoles de la plus récente à la plus ancienne.
function groupByMaker(list) {
  const byConsole = new Map();
  list.forEach((g) => {
    const info = consoleInfo(g.console);
    if (!byConsole.has(info.key)) byConsole.set(info.key, { info, games: [] });
    byConsole.get(info.key).games.push(g);
  });
  const makers = [];
  Array.from(byConsole.values())
    .sort((a, b) => compareConsoleInfo(a.info, b.info))
    .forEach(({ info, games }) => {
      let m = makers.find((x) => x.maker === info.maker);
      if (!m) {
        m = { maker: info.maker, count: 0, consoles: [] };
        makers.push(m);
      }
      m.consoles.push({ key: info.key, label: info.label, games });
      m.count += games.length;
    });
  return makers;
}

// Consoles proposées dans le select : celles de ta collection + les consoles courantes, sans doublon, dans l'ordre des sorties.
function consoleOptionsFor(used) {
  const keys = new Set(used.map((c) => consoleInfo(c).key));
  const extra = CONSOLE_PRESETS.filter((c) => !keys.has(consoleInfo(c).key));
  return [...used, ...extra].sort((a, b) => compareConsoleInfo(consoleInfo(a), consoleInfo(b)) || a.localeCompare(b));
}

// Préférences d'affichage mémorisées sur cet appareil.
const VIEW_KEY = "ludotheque-view";
function loadViewPrefs() {
  try {
    const v = JSON.parse(localStorage.getItem(VIEW_KEY) || "{}");
    return { mode: v.mode === "covers" ? "covers" : "spines", group: v.group !== false, collapsed: Array.isArray(v.collapsed) ? v.collapsed : [] };
  } catch (e) {
    return { mode: "spines", group: true, collapsed: [] };
  }
}

// Les anciens jeux « Envie » (statut supprimé) deviennent « À faire ».
function normalizeGame(g) {
  return STATUS[g.status] ? g : { ...g, status: "backlog" };
}

// ---- Harmonisation des genres : rattache un genre libre au genre standard le plus proche ----
const GENRES_KEY = "ludotheque-genres-harmonized";
const stripAccents = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
// Règles testées dans cet ordre en cas d'égalité ; on retient celle qui apparaît le plus tôt dans le texte.
const GENRE_RULES = [
  ["Action-RPG", /action\W*rpg|souls|hack\W*(and|n|&)?\W*slash/],
  ["Action-Aventure", /action\W*(aventure|adventure)|infiltration|stealth|metroidvania/],
  ["Horreur", /horreur|horror/],
  ["Roguelike", /rogue(like|lite)/],
  ["Tir (FPS / TPS)", /\bfps\b|\btps\b|shooter|looter|battle royale|\btir\b/],
  ["RPG", /\bj?rpg\b|jeu de role/],
  ["Aventure", /point\W*(&|and|et)\W*click|narrati|visual novel|aventure/],
  ["Combat", /beat\W*em\W*up|combat|fighting|versus/],
  ["Course", /course|racing/],
  ["Plateforme", /plateforme|platform/],
  ["Puzzle", /puzzle|reflexion/],
  ["Sport", /\bsport/],
  ["Simulation", /simulation|gestion|city\W*builder|sandbox|simulateur/],
  ["Stratégie", /strategie|tactique|tour par tour|\bstr\b|temps reel/],
];
// Utilisées seulement si aucune règle précise ne correspond.
const GENRE_FALLBACK = [
  ["Action", /\baction\b/],
  ["Simulation", /survie|survival|conduite/],
];

function harmonizeGenre(raw) {
  const n = stripAccents(raw).trim();
  if (!n) return null;
  const exact = GENRES.find((g) => stripAccents(g) === n);
  if (exact) return exact;
  let best = null;
  GENRE_RULES.forEach(([genre, re]) => {
    const m = re.exec(n);
    if (m && (!best || m.index < best.index)) best = { genre, index: m.index };
  });
  if (best) return best.genre;
  const fb = GENRE_FALLBACK.find(([, re]) => re.test(n));
  return fb ? fb[0] : null;
}

function harmonizeGames(list) {
  let changed = 0;
  const out = list.map((g) => {
    if (!g.genre || GENRES.includes(g.genre)) return g;
    const h = harmonizeGenre(g.genre);
    if (!h || h === g.genre) return g;
    changed++;
    return { ...g, genre: h };
  });
  return { list: out, changed };
}

function isPlayStationConsole(name) {
  return PLAYSTATION_FAMILIES.includes(consoleFamily(name));
}

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images.map((img) => (typeof img === "string" ? { src: img, position: "center" } : img));
}

function firstImage(g) {
  const imgs = normalizeImages(g.images);
  if (imgs.length) return imgs[0];
  if (g.cover) return { src: g.cover, position: "center" };
  return null;
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const maxW = 640;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Champs importables et libellés d'en-têtes CSV probables, pour l'auto-détection
const IMPORT_FIELDS = [
  { key: "title", label: "Titre", required: true, guesses: ["titre", "title", "nom", "name", "jeu"] },
  { key: "console", label: "Console", guesses: ["console", "plateforme", "platform", "support"] },
  { key: "genre", label: "Genre", guesses: ["genre", "type", "category", "catégorie"] },
  { key: "year", label: "Année", guesses: ["année", "annee", "year", "date de sortie", "release"] },
  { key: "status", label: "Statut", guesses: ["statut", "status", "état", "etat"] },
  { key: "pegi", label: "PEGI", guesses: ["pegi", "classification", "âge", "age"] },
  { key: "platinum", label: "Platine", guesses: ["platine", "platinum", "trophée"] },
  { key: "metacritic", label: "Metacritic", guesses: ["metacritic", "metascore", "note metacritic"] },
  { key: "price", label: "Prix", guesses: ["prix", "price", "estimation", "valeur", "cote"] },
  { key: "collector", label: "Édition collector", guesses: ["collector", "édition collector", "edition collector"] },
  { key: "collectorNote", label: "Contenu du collector", guesses: ["contenu collector", "contenu du collector", "collector contents"] },
  { key: "synopsis", label: "Synopsis", guesses: ["synopsis", "description", "résumé", "resume"] },
  { key: "cover", label: "Image (URL)", guesses: ["jaquette", "cover", "image", "visuel", "photo"] },
  { key: "notes", label: "Notes", guesses: ["notes", "commentaire", "comment", "remarque", "remarques"] },
];

function guessColumnFor(field, headers) {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const guess of field.guesses) {
    const idx = lower.findIndex((h) => h === guess);
    if (idx !== -1) return headers[idx];
  }
  for (const guess of field.guesses) {
    const idx = lower.findIndex((h) => h.includes(guess));
    if (idx !== -1) return headers[idx];
  }
  return "";
}

function guessStatusKey(raw) {
  if (!raw) return "backlog";
  const v = raw.toLowerCase().trim();
  const table = {
    backlog: ["à faire", "a faire", "backlog", "todo", "non commencé", "non commence", "envie", "wishlist", "à acheter", "a acheter", "souhait"],
    playing: ["en cours", "playing", "in progress", "cours"],
    done: ["terminé", "termine", "done", "fini", "completed", "complété", "complete"],
    dropped: ["abandonné", "abandonne", "dropped", "arrêté", "arrete"],
  };
  for (const key of STATUS_ORDER) {
    if (table[key].some((candidate) => v.includes(candidate))) return key;
  }
  return "backlog";
}

function parseBool(raw) {
  if (!raw) return false;
  const v = String(raw).toLowerCase().trim();
  return ["oui", "yes", "true", "1", "x", "✓", "platine"].includes(v);
}

const emptyGame = () => ({
  id: uid(),
  title: "",
  console: "",
  genre: "",
  year: "",
  status: "backlog",
  synopsis: "",
  modes: [],
  pegi: "",
  platinum: false,
  metacritic: "",
  price: "",
  images: [],
  collector: false,
  collectorNote: "",
  collectorImage: null,
  notes: "",
});

function metacriticColor(score) {
  const n = Number(score);
  if (!score || isNaN(n)) return null;
  if (n >= 75) return "#6BC46D";
  if (n >= 50) return "#E0B94D";
  return "#D9614F";
}

const GLOBAL_CSS = `
        .lt-root {
          --bg: #0A0A0C;
          --surface: #161619;
          --surface2: #1E1E22;
          --text: #F5F5F2;
          --text-muted: #8B8B93;
          --border: #2C2C31;
          --gold: #D4AF37;
          --gold-soft: #E8C86B;
          --shadow-sm: 0 2px 8px rgba(0,0,0,0.4);
          --shadow-md: 0 6px 20px rgba(0,0,0,0.5);
          --shadow-lg: 0 14px 40px rgba(0,0,0,0.6);
          --shadow-gold: 0 4px 16px rgba(212,175,55,0.25);
          background: var(--bg);
          color: var(--text);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          min-height: 100%;
          padding: 28px 24px 60px;
          box-sizing: border-box;
        }
        .lt-root * { box-sizing: border-box; }
        .lt-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }
        .lt-title {
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lt-title .badge {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 13px;
          color: var(--bg);
          background: var(--gold);
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 700;
          box-shadow: var(--shadow-gold);
        }
        .lt-stats {
          display: flex;
          gap: 14px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 12px;
          color: var(--text-muted);
          flex-wrap: wrap;
        }
        .lt-stats span b { color: var(--text); }
        .lt-toolbar {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 26px;
          padding: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          box-shadow: var(--shadow-sm);
        }
        .lt-search {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 7px;
          padding: 7px 10px;
          flex: 1;
          min-width: 160px;
        }
        .lt-search input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--text);
          font-size: 14px;
          width: 100%;
        }
        .lt-search input::placeholder { color: var(--text-muted); }
        .lt-select {
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 7px;
          padding: 8px 10px;
          font-size: 13px;
          outline: none;
        }
        .lt-add-btn {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--gold);
          color: #16130A;
          border: none;
          border-radius: 7px;
          padding: 9px 14px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          box-shadow: var(--shadow-gold);
        }
        .lt-add-btn:hover { filter: brightness(1.08); box-shadow: 0 6px 20px rgba(212,175,55,0.35); }
        .lt-import-btn {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 7px;
          padding: 9px 14px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }
        .lt-import-btn:hover { border-color: var(--gold); color: var(--gold); }
        .lt-add-btn { margin-left: 0; }
        .lt-shelf {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: flex-end;
        }
        .lt-shelf-groups { display: flex; flex-direction: column; gap: 38px; }
        .lt-maker-title {
          display: flex; align-items: baseline; gap: 10px; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.3px;
        }
        .lt-maker-title span, .lt-console-title span {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: var(--gold); font-weight: 700; font-size: 12px; letter-spacing: 0;
        }
        .lt-console-group { margin-top: 18px; }
        .lt-console-title {
          position: sticky; top: 0; z-index: 5; display: flex; align-items: baseline; gap: 8px;
          margin: 0 0 14px; padding: 10px 0 8px; background: var(--bg); border-bottom: 1px solid var(--border);
          font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted);
        }
        .lt-icon-btn {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          border-radius: 7px;
          padding: 9px 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .lt-icon-btn:hover { border-color: var(--gold); color: var(--gold); }
        .lt-header-right { display: flex; align-items: center; gap: 12px; }
        .lt-login-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .lt-login-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: var(--shadow-lg);
          padding: 28px 26px;
          width: 100%;
          max-width: 360px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .lt-login-card h1 { margin: 0; font-size: 22px; font-weight: 800; display: flex; align-items: center; gap: 10px; }
        .lt-login-card p { margin: 0; font-size: 13px; color: var(--text-muted); line-height: 1.5; }
        .lt-login-card input {
          width: 100%;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 7px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
        }
        .lt-login-card input:focus { border-color: var(--gold); }
        .lt-login-card .lt-add-btn { margin-left: 0; justify-content: center; }
        .lt-login-error { color: #E07A67; font-size: 12px; }
        .lt-login-sent { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; line-height: 1.5; }
        .lt-toggle-active { border-color: var(--gold); color: var(--gold); }
        .lt-spine {
          border-radius: 4px 4px 3px 3px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 10px 0 8px;
          position: relative;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          box-shadow: inset -3px 0 6px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.4);
          border: 1px solid rgba(0,0,0,0.3);
          flex-shrink: 0;
        }
        @media (hover: hover) {
          .lt-spine:hover {
            transform: translateY(-8px);
            box-shadow: inset -3px 0 6px rgba(0,0,0,0.35), 0 10px 16px rgba(0,0,0,0.5);
          }
        }
        .lt-spine-title {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,0.92);
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          max-height: 165px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: 0.2px;
        }
        .lt-spine-label {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 1px;
          margin-top: 6px;
        }
        .lt-spine-platinum {
          position: absolute;
          top: 6px;
          right: 6px;
          color: #E8D98A;
          background: rgba(0,0,0,0.4);
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lt-empty {
          border: 1px dashed var(--border);
          border-radius: 12px;
          padding: 60px 20px;
          text-align: center;
          color: var(--text-muted);
        }
        .lt-empty b { color: var(--text); }
        .lt-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10,9,6,0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 20px;
        }
        .lt-modal {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          width: 100%;
          max-width: 620px;
          max-height: 88vh;
          overflow-y: auto;
          display: flex;
          box-shadow: var(--shadow-lg);
        }
        .lt-box-wrap {
          width: 150px;
          flex-shrink: 0;
          padding: 22px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: var(--surface2);
        }
        .lt-box {
          display: flex;
          border-radius: 3px 5px 5px 3px;
          overflow: hidden;
          box-shadow: 6px 10px 22px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.25);
          transform: perspective(700px) rotateY(-14deg);
          flex-shrink: 0;
        }
        .lt-box-spine {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset -4px 0 8px rgba(0,0,0,0.35);
        }
        .lt-box-spine-label {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 1px;
          opacity: 0.6;
        }
        .lt-box-front {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .lt-box-front-title {
          font-size: 13px;
          font-weight: 800;
          line-height: 1.2;
          text-align: center;
          padding: 10px;
        }
        .lt-box-caption {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .lt-box-caption-year {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 11px;
          text-transform: none;
          letter-spacing: 0;
          color: var(--gold);
        }
        .lt-metacritic-badge {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 11px;
          font-weight: 800;
          color: #12130F;
          border-radius: 4px;
          padding: 1px 6px;
          margin-top: 2px;
        }
        .lt-box-caption-price {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 11px;
          text-transform: none;
          letter-spacing: 0;
          color: var(--text);
        }
        .lt-collector-badge {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 9px;
          font-weight: 800;
          color: #16130A;
          background: var(--gold-soft);
          border-radius: 4px;
          padding: 1px 6px;
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .lt-modal-body {
          flex: 1;
          padding: 18px 20px;
          min-width: 0;
        }
        .lt-modal-body-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 14px;
        }
        .lt-close-btn, .lt-delete-btn {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          border-radius: 7px;
          padding: 6px;
          cursor: pointer;
          display: flex;
        }
        .lt-close-btn:hover { color: var(--text); }
        .lt-delete-btn:hover { color: #E07A67; border-color: #A65B4C; }
        .lt-field { margin-bottom: 14px; }
        .lt-field label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          margin-bottom: 5px;
          font-weight: 600;
        }
        .lt-field input[type="text"], .lt-field input[type="number"], .lt-field textarea, .lt-field select {
          width: 100%;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 7px;
          padding: 8px 10px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
        }
        .lt-select-full {
          width: 100%;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 7px;
          padding: 8px 10px;
          font-size: 14px;
          outline: none;
        }
        .lt-field textarea { resize: vertical; min-height: 60px; }
        .lt-row { display: flex; gap: 12px; }
        .lt-row > div { flex: 1; min-width: 0; }
        .lt-status-btns { display: flex; gap: 6px; flex-wrap: wrap; }
        .lt-status-btn {
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text-muted);
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 600;
        }
        .lt-status-btn.active { color: #1A1710; border-color: transparent; }
        .lt-save-indicator {
          font-size: 11px;
          color: var(--text-muted);
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }
        .lt-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 7px;
          padding: 8px 10px;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          width: 100%;
        }
        .lt-toggle.active { color: #E8D98A; border-color: #6b5e2a; }
        .lt-toggle-inline {
          display: inline-flex;
          width: 22px;
          height: 22px;
          padding: 0;
          border-radius: 50%;
          align-items: center;
          justify-content: center;
          vertical-align: middle;
          margin-right: 6px;
        }
        .lt-toggle-inline .lt-toggle-track { display: none; }
        .lt-collector-block {
          margin-top: 8px;
        }
        .lt-toggle-track {
          margin-left: auto;
          width: 30px;
          height: 17px;
          border-radius: 20px;
          background: var(--border);
          position: relative;
          transition: background 0.15s ease;
          flex-shrink: 0;
        }
        .lt-toggle.active .lt-toggle-track { background: var(--gold); }
        .lt-toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.15s ease;
        }
        .lt-toggle.active .lt-toggle-thumb { transform: translateX(13px); }
        .lt-images-row {
          display: flex;
          gap: 8px;
        }
        .lt-image-slot {
          width: 64px;
          height: 64px;
          border-radius: 7px;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }
        .lt-image-slot-cover { width: 72px; height: 96px; }
        .lt-image-slot-filled { border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
        .lt-shots-row {
          display: flex;
          gap: 10px;
        }
        .lt-shot-slot {
          flex: 1;
          aspect-ratio: 16 / 9;
          border-radius: 8px;
          position: relative;
          overflow: hidden;
        }
        .lt-shot-slot-filled { border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
        .lt-shot-slot-add {
          border: 1.5px dashed var(--border);
          background: var(--bg);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 600;
        }
        .lt-shot-slot-add:hover { border-color: var(--gold); color: var(--gold); }
        .lt-image-hint {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 6px;
        }
        .lt-image-remove {
          position: absolute;
          top: 2px;
          right: 2px;
          background: rgba(0,0,0,0.65);
          border: none;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
        }
        .lt-image-slot-add {
          border: 1.5px dashed var(--border);
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .lt-image-slot-add:hover { border-color: var(--gold); }
        .lt-textarea-auto,
        .lt-field textarea.lt-textarea-auto {
          resize: none;
          overflow: hidden;
          min-height: 40px;
        }
        .lt-lightbox {
          position: fixed;
          inset: 0;
          background: rgba(6,6,7,0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 30px;
          cursor: zoom-out;
        }
        .lt-lightbox img {
          width: 90vw;
          height: 90vh;
          height: 90dvh;
          max-width: 900px;
          max-height: 90vh;
          max-height: 90dvh;
          object-fit: contain;
          border-radius: 6px;
          box-shadow: var(--shadow-lg);
          cursor: default;
        }
        .lt-lightbox-close {
          position: absolute;
          top: 20px;
          right: 24px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 50%;
          width: 38px;
          height: 38px;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .lt-lightbox-close:hover { background: rgba(255,255,255,0.16); }
        .lt-picker-modal {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 28px 24px 22px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          position: relative;
          box-shadow: var(--shadow-lg);
          max-width: 260px;
        }
        .lt-picker-close {
          position: absolute;
          top: 10px;
          right: 10px;
        }
        .lt-picker-label {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 700;
        }
        .lt-picker-title {
          font-size: 15px;
          font-weight: 800;
          text-align: center;
        }
        .lt-picker-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }
        .lt-picker-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 20px 10px;
          color: var(--text-muted);
          font-size: 13px;
          text-align: center;
        }
        .lt-import-modal {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          width: 100%;
          max-width: 480px;
          max-height: 88vh;
          overflow-y: auto;
          box-shadow: var(--shadow-lg);
        }
        .lt-import-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }
        .lt-import-header h2 { font-size: 16px; margin: 0; font-weight: 700; }
        .lt-import-body { padding: 18px 20px; }
        .lt-import-hint { font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0 0 16px; }
        .lt-dropzone {
          width: 100%;
          border: 1.5px dashed var(--border);
          border-radius: 10px;
          background: var(--bg);
          padding: 28px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .lt-dropzone:hover { border-color: var(--gold); color: var(--gold); }
        .lt-import-error { color: #E07A67; font-size: 12px; margin-top: 12px; }
        .lt-mapping-grid { display: flex; flex-direction: column; gap: 10px; }
        .lt-mapping-row { display: flex; align-items: center; gap: 8px; }
        .lt-mapping-label { font-size: 13px; width: 90px; flex-shrink: 0; font-weight: 600; }
        .lt-mapping-row .lt-select { flex: 1; }
        .lt-import-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
        .lt-import-success { display: flex; align-items: center; gap: 10px; font-size: 14px; padding: 8px 0 4px; }
        /* ===================== UX refonte : layout, barre d'outils, fiche ===================== */
        .lt-root { min-height: 100vh; min-height: 100dvh; -webkit-text-size-adjust: 100%; }
        .lt-spine, .lt-root button { -webkit-tap-highlight-color: transparent; }
        .lt-spine::after { content: ""; position: absolute; top: 0; bottom: 0; left: -4px; right: -4px; }
        .lt-spine:active { transform: translateY(-4px); }

        .lt-header { align-items: flex-start; flex-wrap: nowrap; margin-bottom: 18px; }
        .lt-header-left { min-width: 0; flex: 1; }
        .lt-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .lt-sync { display: flex; align-items: center; gap: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; color: var(--text-muted); }
        .lt-sync-dot { width: 8px; height: 8px; border-radius: 50%; background: #6BC46D; display: inline-block; }
        .lt-sync-dot.busy { background: var(--gold); animation: lt-pulse 1s ease-in-out infinite; }
        .lt-sync-dot.err { background: #D9614F; }
        .lt-sync.err { color: #E07A67; }
        .lt-sync-text { display: none; }
        .lt-sync.err .lt-sync-text { display: inline; }
        @keyframes lt-pulse { 50% { opacity: 0.35; } }
        .lt-icon-btn { min-width: 40px; min-height: 40px; justify-content: center; }

        .lt-menu-wrap { position: relative; }
        .lt-menu {
          position: absolute; top: calc(100% + 8px); right: 0; min-width: 240px; z-index: 70;
          background: var(--surface2); border: 1px solid var(--border); border-radius: 12px;
          box-shadow: var(--shadow-lg); padding: 6px;
        }
        .lt-menu button {
          display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px;
          background: none; border: none; color: var(--text); font-size: 14px; padding: 10px 12px;
          border-radius: 8px; cursor: pointer; text-align: left;
        }
        .lt-menu button:hover { background: rgba(255,255,255,0.06); }
        .lt-menu button.danger { color: #E07A67; }
        .lt-menu hr { border: none; border-top: 1px solid var(--border); margin: 6px 0; }

        .lt-toolbar { flex-wrap: wrap; gap: 10px; }
        .lt-toolbar-main { display: flex; gap: 8px; flex: 1 1 240px; min-width: 0; }
        .lt-toolbar-main .lt-search { flex: 1; min-width: 0; }
        .lt-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .lt-toolbar-actions { display: flex; gap: 8px; margin-left: auto; }
        .lt-btn {
          display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap;
          background: transparent; color: var(--text); border: 1px solid var(--border); border-radius: 7px;
          padding: 9px 14px; font-weight: 600; font-size: 13px; cursor: pointer;
        }
        .lt-btn:hover { border-color: var(--gold); color: var(--gold); }
        .lt-filters-btn { display: none; }
        .lt-filters-btn[aria-expanded="true"] { border-color: var(--gold); color: var(--gold); }
        .lt-count { background: var(--gold); color: #16130A; border-radius: 10px; font-size: 11px; font-weight: 800; padding: 0 6px; margin-left: 2px; }
        .lt-filters-reset { background: none; border: none; color: var(--text-muted); font-size: 12px; text-decoration: underline; cursor: pointer; padding: 8px 4px; }

        /* ---- Bascule d'affichage + jaquettes ---- */
        .lt-seg { display: flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; flex-shrink: 0; background: var(--bg); }
        .lt-seg button {
          display: flex; align-items: center; justify-content: center; gap: 6px; background: none; border: none; color: var(--text-muted);
          padding: 9px 12px; font-size: 13px; font-weight: 600; cursor: pointer;
        }
        .lt-seg button + button { border-left: 1px solid var(--border); }
        .lt-seg button.on { background: var(--surface2); color: var(--gold); }
        .lt-seg button:not(.on):hover { color: var(--text); }
        .lt-img { position: absolute; inset: 0; display: block; overflow: hidden; background: #0c0c0e; }
        .lt-img-bg { position: absolute; inset: -10%; background-size: cover; background-position: center; filter: blur(14px) brightness(0.5) saturate(1.15); }
        .lt-img img { position: relative; display: block; width: 100%; height: 100%; object-fit: contain; }
        .lt-img-btn { position: absolute; inset: 0; padding: 0; border: none; background: none; cursor: zoom-in; }
        .lt-box-front { position: relative; }
        .lt-cover-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 5px; z-index: 1; box-shadow: 1px 0 4px rgba(0,0,0,0.45); }
        .lt-collapse-btn {
          display: flex; align-items: baseline; gap: 8px; width: 100%; padding: 0; background: none; border: none; cursor: pointer;
          color: inherit; font: inherit; letter-spacing: inherit; text-transform: inherit; text-align: left;
        }
        .lt-collapse-btn:hover { color: var(--text); }
        .lt-chev { align-self: center; flex-shrink: 0; transition: transform 0.15s ease; }
        .lt-chev.closed { transform: rotate(-90deg); }
        .lt-toast {
          position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(20px + env(safe-area-inset-bottom)); z-index: 80;
          display: flex; align-items: center; gap: 12px; max-width: min(92vw, 460px); padding: 12px 14px;
          background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow-lg); font-size: 13px;
        }
        .lt-toast button { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; padding: 4px; }
        .lt-covers { --cw: 150px; display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--cw), 1fr)); gap: 14px; align-items: start; }
        .lt-cover {
          aspect-ratio: 2 / 3; container-type: inline-size; position: relative; display: block; width: 100%; padding: 0; border: none; border-radius: 6px;
          overflow: hidden; cursor: pointer; background: #111; text-align: left;
          box-shadow: 0 2px 6px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.06);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .lt-cover-fallback { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 10px 8px 26px; text-align: center; }
        .lt-cover-title { font-weight: 800; line-height: 1.15; font-size: 12px; font-size: clamp(11px, 11cqw, 17px); overflow-wrap: anywhere; }
        .lt-cover-label { position: absolute; bottom: 8px; left: 0; right: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 9px; font-weight: 700; letter-spacing: 1px; opacity: 0.6; }
        .lt-cover-hover {
          z-index: 2; position: absolute; left: 0; right: 0; bottom: 0; padding: 26px 8px 8px; font-size: 12px; font-weight: 700; line-height: 1.2; color: #fff;
          background: linear-gradient(transparent, rgba(0,0,0,0.88)); opacity: 0; transition: opacity 0.15s ease;
        }
        .lt-cover-chip { z-index: 2; position: absolute; top: 6px; left: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 9px; font-weight: 700; background: rgba(0,0,0,0.7); color: #fff; border-radius: 4px; padding: 1px 5px; }
        .lt-cover:focus-visible, .lt-spine:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
        .lt-cover:focus-visible .lt-cover-hover { opacity: 1; }
        @media (hover: hover) {
          .lt-cover:hover { transform: translateY(-4px) scale(1.03); box-shadow: var(--shadow-lg); z-index: 2; }
          .lt-cover:hover .lt-cover-hover { opacity: 1; }
        }

        /* ---- Fiche détail (feuille) ---- */
        .lt-sheet-overlay {
          position: fixed; inset: 0; z-index: 50; background: rgba(6,6,7,0.72);
          display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .lt-sheet {
          background: var(--surface); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 780px;
          max-height: calc(100vh - 48px); max-height: calc(100dvh - 48px);
          display: flex; flex-direction: column; box-shadow: var(--shadow-lg); overflow: hidden;
        }
        .lt-sheet-header {
          display: flex; align-items: center; gap: 12px; padding: 12px 16px; flex-shrink: 0;
          border-bottom: 1px solid var(--border); background: var(--surface);
        }
        .lt-sheet-heading { flex: 1; min-width: 0; }
        .lt-sheet-kicker { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); font-weight: 700; }
        .lt-sheet-title { font-size: 16px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lt-sheet-autosave { display: flex; align-items: center; gap: 5px; flex-shrink: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; color: var(--text-muted); }
        .lt-sheet-autosave.warn { color: var(--gold); }
        .lt-sheet-scroll { overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 20px 22px 28px; flex: 1; }
        .lt-sheet-hero { display: flex; gap: 20px; align-items: flex-start; }
        .lt-sheet-hero-main { flex: 1; min-width: 0; }
        .lt-sheet .lt-box-wrap { width: 150px; flex-shrink: 0; border-radius: 12px; }
        .lt-section { border-top: 1px solid var(--border); margin-top: 18px; padding-top: 16px; }
        .lt-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--gold); font-weight: 800; margin: 0 0 12px; }
        .lt-row { flex-wrap: wrap; }
        .lt-row > .lt-field { flex: 1 1 150px; min-width: 0; }
        .lt-danger-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-top: 26px; min-height: 44px;
          background: transparent; border: 1px solid #5a2a24; color: #E07A67; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
        }
        .lt-danger-btn:hover { background: rgba(217,97,79,0.1); }
        .lt-only-mobile { display: none; }
        .lt-only-desktop { display: inline-flex; }
        @keyframes lt-sheet-in { from { transform: translateY(28px); opacity: 0; } to { transform: none; opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .lt-sheet { animation: none !important; } }
        @media (hover: hover) { .lt-spine:active { transform: none; } }

        /* ---- Mobile ---- */
        @media (max-width: 719px) {
          .lt-root { padding: max(14px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 40px max(16px, env(safe-area-inset-left)); }
          .lt-title { font-size: 24px; }
          .lt-header { flex-wrap: wrap; row-gap: 8px; }
          .lt-header-left { display: contents; }
          .lt-title { flex: 1; min-width: 0; order: 1; }
          .lt-header-right { order: 2; }
          .lt-stats { order: 3; flex: 0 0 100%; margin-top: 0; flex-wrap: nowrap; overflow-x: auto; white-space: nowrap; scrollbar-width: none; -webkit-overflow-scrolling: touch; -webkit-mask-image: linear-gradient(to right, #000 88%, transparent); mask-image: linear-gradient(to right, #000 88%, transparent); }
          .lt-stats::-webkit-scrollbar { display: none; }
          .lt-toolbar { flex-direction: column; align-items: stretch; background: none; border: none; box-shadow: none; padding: 0; margin-bottom: 18px; }
          .lt-toolbar-main { flex: none; }
          .lt-filters-btn { display: flex; min-height: 44px; }
          .lt-filters { display: none; }
          .lt-filters.open { display: grid; grid-template-columns: 1fr 1fr; }
          .lt-filters .lt-select { width: 100%; min-height: 44px; }
          .lt-filters .lt-btn, .lt-filters-reset { min-height: 44px; }
          .lt-toolbar-actions { display: grid; grid-template-columns: 1fr 1fr; margin-left: 0; }
          .lt-toolbar-actions > button { min-height: 46px; margin-left: 0; }
          .lt-search { min-height: 44px; }
          .lt-root .lt-search input, .lt-root .lt-select, .lt-root .lt-select-full { font-size: 16px; }
          .lt-root .lt-field input[type="text"], .lt-root .lt-field input[type="number"], .lt-root .lt-field textarea, .lt-root .lt-field select { font-size: 16px; padding: 11px 12px; }
          .lt-login-card input { font-size: 16px; }
          .lt-status-btn { padding: 9px 13px; font-size: 13px; min-height: 40px; }
          .lt-toggle { min-height: 44px; }
          .lt-image-remove { width: 28px; height: 28px; }
          .lt-seg button { min-width: 44px; min-height: 44px; padding: 0; }
          .lt-seg button span { display: none; }
          .lt-filters-btn { padding: 0 12px; min-width: 48px; gap: 4px; }
          .lt-btn-label { display: none; }
          .lt-covers { --cw: 104px; gap: 10px; }
          .lt-maker-title { font-size: 18px; }
          .lt-collapse-btn { min-height: 36px; align-items: center; }
          .lt-only-mobile { display: inline-flex; }
          .lt-only-desktop { display: none; }
          .lt-sheet-overlay { padding: 0; align-items: stretch; }
          .lt-sheet { max-width: none; max-height: none; height: 100vh; height: 100dvh; border-radius: 0; border: none; animation: lt-sheet-in 0.2s ease-out; }
          .lt-sheet-header { padding: calc(10px + env(safe-area-inset-top)) 12px 10px; }
          .lt-sheet-scroll { padding: 16px 16px calc(32px + env(safe-area-inset-bottom)); }
          .lt-sheet-hero { flex-direction: column; gap: 14px; }
          .lt-sheet-hero-main { width: 100%; }
          .lt-sheet .lt-box-wrap { width: 100%; flex-direction: row; justify-content: flex-start; gap: 18px; padding: 14px 16px; }
          .lt-sheet .lt-box-caption { align-items: flex-start; }
          .lt-lightbox { padding: 12px; }
          .lt-lightbox img { width: 100%; height: 100%; max-width: none; max-height: none; }
          .lt-lightbox-close { top: calc(14px + env(safe-area-inset-top)); right: 14px; }
          .lt-picker-modal { width: min(92vw, 320px); max-width: none; }
          .lt-menu { min-width: 250px; }
        }
        @media (min-width: 720px) {
          .lt-sync-text { display: inline; }
          .lt-stats { margin-top: 8px; }
        }
`;

function Ludotheque({ user, onSignOut }) {
  const [games, setGames] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterConsole, setFilterConsole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [selected, setSelected] = useState(null); // game being viewed/edited
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pickedGame, setPickedGame] = useState(null); // "empty" | game | null
  const [viewMode, setViewMode] = useState(() => loadViewPrefs().mode); // "spines" | "covers"
  const [groupByConsole, setGroupByConsole] = useState(() => loadViewPrefs().group);
  const [collapsed, setCollapsed] = useState(() => new Set(loadViewPrefs().collapsed)); // clés « m:Sony » / « c:ps3 »
  const [notice, setNotice] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const backupInputRef = useRef(null);
  const saveTimer = useRef(null);

  const syncedRef = useRef(new Map()); // id -> objet jeu tel qu'il est dans le cloud
  const latestRef = useRef([]);
  const pendingRef = useRef(false);
  const syncingRef = useRef(false);
  const dirtyRef = useRef(false);
  const flagsAfterSyncRef = useRef([]); // clés localStorage à poser une fois l'envoi cloud réussi
  const lastFetchRef = useRef(0);
  const [syncError, setSyncError] = useState(false);

  const MIGRATED_KEY = "ludotheque-migrated";

  async function syncNow() {
    if (syncingRef.current) {
      dirtyRef.current = true;
      return;
    }
    syncingRef.current = true;
    try {
      do {
        dirtyRef.current = false;
        await pushChanges(supabase, user.id, syncedRef.current, latestRef.current);
      } while (dirtyRef.current);
      pendingRef.current = false;
      setSyncError(false);
      setSaving(false);
      flagsAfterSyncRef.current.forEach((k) => localStorage.setItem(k, "1"));
      flagsAfterSyncRef.current = [];
    } catch (e) {
      console.error("Erreur de synchro", e);
      setSyncError(true);
      setSaving(false);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(syncNow, 8000); // nouvelle tentative
    } finally {
      syncingRef.current = false;
    }
  }

  function persist(next) {
    latestRef.current = next;
    pendingRef.current = true;
    setGames(next);
    setSaving(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(syncNow, 600);
  }

  // Chargement initial depuis le cloud (+ migration unique des données locales d'avant la synchro)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cloud = await fetchAllGames(supabase);
        if (cancelled) return;
        lastFetchRef.current = Date.now();
        let list = cloud.map(normalizeGame);
        if (!localStorage.getItem(GENRES_KEY)) {
          // Harmonisation unique des genres existants (une fois par appareil)
          const h = harmonizeGames(list);
          if (h.changed) {
            list = h.list;
            flagsAfterSyncRef.current.push(GENRES_KEY);
            setNotice(`Genres harmonisés : ${h.changed} jeu${h.changed > 1 ? "x" : ""} mis à jour.`);
          } else {
            localStorage.setItem(GENRES_KEY, "1");
          }
        }
        syncedRef.current = new Map(cloud.map((g) => [g.id, g]));
        latestRef.current = list;
        setGames(list);
        if (list.some((g, i) => g !== cloud[i])) persist(list); // anciens « Envie » -> « À faire » + genres, envoyés au cloud
        if (!localStorage.getItem(MIGRATED_KEY)) {
          // Fusion unique des données locales d'avant la synchro : on n'ajoute que les jeux absents du cloud.
          let local = [];
          try {
            const raw = localStorage.getItem("ludotheque-games");
            local = raw ? JSON.parse(raw) : [];
          } catch (err) {
            local = [];
          }
          const cloudIds = new Set(cloud.map((g) => g.id));
          const toMerge = (Array.isArray(local) ? local : [])
            .map((g) => normalizeGame({ ...g, id: g.id || uid() }))
            .filter((g) => !cloudIds.has(g.id));
          if (toMerge.length) {
            flagsAfterSyncRef.current.push(MIGRATED_KEY); // posé seulement une fois l'envoi réussi
            persist([...list, ...harmonizeGames(toMerge).list]);
          } else {
            localStorage.setItem(MIGRATED_KEY, "1");
          }
        }
      } catch (e) {
        console.error("Erreur de chargement", e);
        if (!cancelled) {
          setSyncError(true);
          setGames([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Récupère les modifs faites depuis un autre appareil quand on revient sur l'onglet
  useEffect(() => {
    async function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (pendingRef.current || syncingRef.current) return;
      if (Date.now() - lastFetchRef.current < 30000) return;
      try {
        const cloud = await fetchAllGames(supabase);
        if (pendingRef.current || syncingRef.current) return; // une modif locale est partie entre-temps
        lastFetchRef.current = Date.now();
        const list = cloud.map(normalizeGame);
        syncedRef.current = new Map(cloud.map((g) => [g.id, g]));
        latestRef.current = list;
        setGames(list);
        setSyncError(false);
        if (list.some((g, i) => g !== cloud[i])) persist(list);
      } catch (e) {
        console.error("Erreur de rafraîchissement", e);
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  function upsertGame(game) {
    const exists = games.some((g) => g.id === game.id);
    const next = exists ? games.map((g) => (g.id === game.id ? game : g)) : [...games, game];
    persist(next);
  }

  function deleteGame(id) {
    persist(games.filter((g) => g.id !== id));
    setSelected(null);
  }

  function importGames(newGames) {
    const byTitle = new Map(games.map((g) => [g.title.trim().toLowerCase(), g]));
    const merged = [...games];
    let updated = 0;
    let added = 0;
    newGames.forEach((ng) => {
      const key = ng.title.trim().toLowerCase();
      const existing = byTitle.get(key);
      if (existing) {
        const idx = merged.findIndex((g) => g.id === existing.id);
        // On ne remplace un champ existant que si le nouveau n'est pas vide, pour ne pas écraser des retouches manuelles
        const patched = { ...existing };
        Object.keys(ng).forEach((k) => {
          if (k === "id") return;
          const val = ng[k];
          const isEmpty = val === "" || val === null || (Array.isArray(val) && val.length === 0);
          if (!isEmpty) patched[k] = val;
        });
        merged[idx] = patched;
        updated++;
      } else {
        merged.push({ ...emptyGame(), ...ng, id: ng.id });
        added++;
      }
    });
    persist(merged);
    return { updated, added };
  }

  const activeFilters = (filterConsole ? 1 : 0) + (filterStatus ? 1 : 0) + (sortBy !== "title" ? 1 : 0);

  const searching = search.trim().length > 0;
  const consoleKeys = useMemo(() => groupByMaker(games || []).flatMap((m) => m.consoles.map((c) => c.key)), [games]);
  const allCollapsed = consoleKeys.length > 0 && consoleKeys.every((k) => collapsed.has("c:" + k));

  function toggleCollapse(key) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function collapseAll() {
    setCollapsed(new Set(consoleKeys.map((k) => "c:" + k)));
  }

  function harmonizeNow() {
    const h = harmonizeGames(games);
    if (!h.changed) {
      setNotice("Tous les genres sont déjà dans la liste.");
      return;
    }
    persist(h.list);
    setNotice(`Genres harmonisés : ${h.changed} jeu${h.changed > 1 ? "x" : ""} mis à jour.`);
  }

  function resetFilters() {
    setFilterConsole("");
    setFilterStatus("");
    setSortBy("title");
  }

  useScrollLock(!!(selected || creating || importing || pickedGame));

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify({ mode: viewMode, group: groupByConsole, collapsed: Array.from(collapsed) }));
    } catch (e) {
      /* stockage indisponible : on ne mémorise pas */
    }
  }, [viewMode, groupByConsole, collapsed]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 9000);
    return () => clearTimeout(t);
  }, [notice]);

  function pickRandom() {
    const candidates = games.filter((g) => g.status === "backlog");
    if (!candidates.length) {
      setPickedGame("empty");
      return;
    }
    const weights = candidates.map((g) => {
      const m = Number(g.metacritic);
      return m && !isNaN(m) ? m : 55;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        setPickedGame(candidates[i]);
        return;
      }
    }
    setPickedGame(candidates[candidates.length - 1]);
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(games, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ludotheque-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function restoreBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error("format invalide");
        if (window.confirm(`Ceci va remplacer toute ta ludothèque actuelle (${games.length} jeux) par le contenu de ce fichier (${parsed.length} jeux). Continuer ?`)) {
          persist(parsed.map((g) => ({ ...g, id: g.id || uid() })));
        }
      } catch (err) {
        alert("Ce fichier ne semble pas être un backup valide.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const consoles = useMemo(() => {
    if (!games) return [];
    return Array.from(new Set(games.map((g) => g.console).filter(Boolean))).sort((a, b) => compareConsoleInfo(consoleInfo(a), consoleInfo(b)) || a.localeCompare(b));
  }, [games]);

  const filtered = useMemo(() => {
    if (!games) return [];
    let list = games.filter((g) => {
      const matchSearch = g.title.toLowerCase().includes(search.toLowerCase());
      const matchConsole = !filterConsole || g.console === filterConsole;
      const matchStatus = !filterStatus || g.status === filterStatus;
      return matchSearch && matchConsole && matchStatus;
    });
    const byTitle = (a, b) => a.title.localeCompare(b.title, "fr");
    list.sort((a, b) => {
      if (sortBy === "console") return compareConsoleInfo(consoleInfo(a.console), consoleInfo(b.console)) || byTitle(a, b);
      if (sortBy === "status") return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || byTitle(a, b);
      return byTitle(a, b);
    });
    return list;
  }, [games, search, filterConsole, filterStatus, sortBy]);

  const counts = useMemo(() => {
    if (!games) return {};
    const c = {};
    STATUS_ORDER.forEach((s) => (c[s] = 0));
    games.forEach((g) => (c[g.status] = (c[g.status] || 0) + 1));
    return c;
  }, [games]);

  const totalValue = useMemo(() => {
    if (!games) return 0;
    return games.reduce((sum, g) => {
      const n = parseFloat(String(g.price || "").replace(",", ".").replace(/[^\d.]/g, ""));
      return isNaN(n) ? sum : sum + n;
    }, 0);
  }, [games]);

  const groupedByMaker = useMemo(() => groupByMaker(filtered), [filtered]);

  const openOnKey = (g) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelected(g);
    }
  };

  function renderSpine(g) {
    const style = getSpineStyle(g.console);
    return (
      <div
        key={g.id}
        className="lt-spine"
        role="button"
        tabIndex={0}
        style={{ background: style.bg, width: style.width, height: style.height }}
        onClick={() => setSelected(g)}
        onKeyDown={openOnKey(g)}
        title={g.title}
        aria-label={g.title}
      >
        <span className="lt-spine-title" style={{ color: style.text, maxHeight: style.height - 45 }}>
          {g.title || "Sans titre"}
        </span>
        {style.label && (
          <span className="lt-spine-label" style={{ color: style.text, opacity: 0.55 }}>
            {style.label}
          </span>
        )}
      </div>
    );
  }

  // Mode « jaquettes » : cartes 2:3 uniformes ; l'image est affichée entière (fond flou), sans recadrage.
  function renderCover(g) {
    const style = getSpineStyle(g.console);
    const img = firstImage(g);
    return (
      <button
        key={g.id}
        className="lt-cover"
        style={{ background: img ? "#0c0c0e" : style.bg }}
        onClick={() => setSelected(g)}
        title={g.title}
        aria-label={g.title}
      >
        {img ? (
          <>
            <CoverImage src={img.src} />
            <span className="lt-cover-accent" style={{ background: style.bg }} />
            <span className="lt-cover-hover">{g.title}</span>
            {!groupByConsole && style.label && <span className="lt-cover-chip">{style.label}</span>}
          </>
        ) : (
          <span className="lt-cover-fallback" style={{ color: style.text }}>
            <span className="lt-cover-title">{g.title || "Sans titre"}</span>
            {style.label && <span className="lt-cover-label">{style.label}</span>}
          </span>
        )}
      </button>
    );
  }

  const renderGames = (list) =>
    viewMode === "covers" ? <div className="lt-covers">{list.map((g) => renderCover(g))}</div> : <div className="lt-shelf">{list.map((g) => renderSpine(g))}</div>;

  return (
    <div className="lt-root">
      <style>{GLOBAL_CSS}</style>

      <div className="lt-header">
        <div className="lt-header-left">
          <h1 className="lt-title">
            <Gamepad2 size={26} color="#D4AF37" />
            Ma ludothèque
            {games && <span className="badge">{games.length}</span>}
          </h1>
          {games && (
            <div className="lt-stats">
              {STATUS_ORDER.map((s) => (
                <span key={s}>
                  {STATUS[s].label} <b>{counts[s] || 0}</b>
                </span>
              ))}
              {totalValue > 0 && (
                <span>
                  Valeur <b style={{ color: "var(--gold)" }}>{totalValue.toFixed(0)}€</b>
                </span>
              )}
            </div>
          )}
        </div>
        <div className="lt-header-right">
          <div className={"lt-sync" + (syncError ? " err" : "")} title={syncError ? "Synchro en échec — nouvelle tentative…" : saving ? "Synchronisation…" : "Synchronisé"}>
            <i className={"lt-sync-dot" + (syncError ? " err" : saving ? " busy" : "")} />
            <span className="lt-sync-text">{syncError ? "Synchro en échec" : saving ? "Synchronisation…" : games ? "Synchronisé" : ""}</span>
          </div>
          <MoreMenu
            items={[
              ...(groupByConsole
                ? [
                    allCollapsed
                      ? { label: "Tout déplier", icon: <ChevronsUpDown size={16} />, onClick: () => setCollapsed(new Set()) }
                      : { label: "Tout replier", icon: <ChevronsDownUp size={16} />, onClick: collapseAll },
                  ]
                : []),
              { label: "Harmoniser les genres", icon: <Tags size={16} />, onClick: harmonizeNow },
              { divider: true },
              { label: "Importer un CSV", icon: <Upload size={16} />, onClick: () => setImporting(true) },
              { label: "Exporter une sauvegarde", icon: <Download size={16} />, onClick: exportBackup },
              { label: "Restaurer une sauvegarde", icon: <Upload size={16} />, onClick: () => backupInputRef.current && backupInputRef.current.click() },
              { divider: true },
              { label: "Se déconnecter", icon: <LogOut size={16} />, onClick: onSignOut, danger: true },
            ]}
          />
        </div>
      </div>
      <input type="file" accept=".json" ref={backupInputRef} style={{ display: "none" }} onChange={restoreBackup} />

      {games && (
        <div className="lt-toolbar">
          <div className="lt-toolbar-main">
            <div className="lt-search">
              <Search size={15} color="#9C927D" />
              <input
                placeholder="Rechercher un jeu…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="lt-seg" role="group" aria-label="Mode d'affichage">
              <button className={viewMode === "spines" ? "on" : ""} onClick={() => setViewMode("spines")} aria-pressed={viewMode === "spines"} aria-label="Affichage en tranches" title="Tranches">
                <Library size={16} /> <span>Tranches</span>
              </button>
              <button className={viewMode === "covers" ? "on" : ""} onClick={() => setViewMode("covers")} aria-pressed={viewMode === "covers"} aria-label="Affichage en jaquettes" title="Jaquettes">
                <LayoutGrid size={16} /> <span>Jaquettes</span>
              </button>
            </div>
            <button
              className={"lt-btn lt-filters-btn" + (activeFilters ? " lt-toggle-active" : "")}
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-label="Filtres"
            >
              <SlidersHorizontal size={16} /> <span className="lt-btn-label">Filtres</span>
              {activeFilters > 0 && <span className="lt-count">{activeFilters}</span>}
            </button>
          </div>
          <div className={"lt-filters" + (filtersOpen ? " open" : "")}>
            <select className="lt-select" value={filterConsole} onChange={(e) => setFilterConsole(e.target.value)} aria-label="Console">
              <option value="">Toutes consoles</option>
              {consoles.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select className="lt-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Statut">
              <option value="">Tous statuts</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS[s].label}</option>
              ))}
            </select>
            <select className="lt-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Tri">
              <option value="title">Trier : titre</option>
              <option value="console">Trier : console</option>
              <option value="status">Trier : statut</option>
            </select>
            <button
              className={"lt-btn" + (groupByConsole ? " lt-toggle-active" : "")}
              onClick={() => setGroupByConsole((v) => !v)}
              aria-pressed={groupByConsole}
            >
              <Layers size={15} /> Grouper
            </button>
            {activeFilters > 0 && (
              <button className="lt-filters-reset" onClick={resetFilters}>Réinitialiser</button>
            )}
          </div>
          <div className="lt-toolbar-actions">
            <button className="lt-btn" onClick={pickRandom}>
              <Dices size={16} /> Piocher
            </button>
            <button className="lt-add-btn" onClick={() => setCreating(true)}>
              <Plus size={16} /> Ajouter
            </button>
          </div>
        </div>
      )}

      {!games && <div className="lt-empty">Chargement…</div>}

      {games && filtered.length === 0 && (
        <div className="lt-empty">
          {games.length === 0 ? (
            <>Ta ludothèque est vide. <b>Ajoute ton premier jeu</b> pour commencer.</>
          ) : (
            <>Aucun jeu ne correspond à ces filtres.</>
          )}
        </div>
      )}

      {games && filtered.length > 0 && !groupByConsole && renderGames(filtered)}

      {games && filtered.length > 0 && groupByConsole && (
        <div className="lt-shelf-groups">
          {groupedByMaker.map((m) => {
            const mOpen = searching || !collapsed.has("m:" + m.maker);
            return (
              <section key={m.maker} className="lt-maker">
                <h2 className="lt-maker-title">
                  <button className="lt-collapse-btn" onClick={() => toggleCollapse("m:" + m.maker)} aria-expanded={mOpen}>
                    <ChevronDown size={18} className={"lt-chev" + (mOpen ? "" : " closed")} />
                    {m.maker} <span>{m.count}</span>
                  </button>
                </h2>
                {mOpen &&
                  m.consoles.map((c) => {
                    const cOpen = searching || !collapsed.has("c:" + c.key);
                    return (
                      <div key={c.key} className="lt-console-group">
                        <h3 className="lt-console-title">
                          <button className="lt-collapse-btn" onClick={() => toggleCollapse("c:" + c.key)} aria-expanded={cOpen}>
                            <ChevronDown size={14} className={"lt-chev" + (cOpen ? "" : " closed")} />
                            {c.label} <span>{c.games.length}</span>
                          </button>
                        </h3>
                        {cOpen && renderGames(c.games)}
                      </div>
                    );
                  })}
              </section>
            );
          })}
        </div>
      )}

      {(selected || creating) && (
        <GameModal
          game={selected || emptyGame()}
          isNew={!!creating}
          consoleOptions={consoleOptionsFor(consoles)}
          onClose={() => {
            setSelected(null);
            setCreating(false);
          }}
          onSave={(g) => {
            upsertGame(g);
          }}
          onDelete={(id) => {
            deleteGame(id);
            setCreating(false);
          }}
        />
      )}

      {importing && (
        <ImportModal onClose={() => setImporting(false)} onImport={importGames} />
      )}

      {notice && (
        <div className="lt-toast" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Fermer le message">
            <X size={14} />
          </button>
        </div>
      )}

      {pickedGame && (
        <div className="lt-overlay" onClick={() => setPickedGame(null)}>
          <div className="lt-picker-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lt-close-btn lt-picker-close" onClick={() => setPickedGame(null)} title="Fermer">
              <X size={15} />
            </button>
            {pickedGame === "empty" ? (
              <div className="lt-picker-empty">
                <Dices size={28} color="#9C927D" />
                <p>Ton backlog est vide — rien à piocher !</p>
              </div>
            ) : (
              <>
                <div className="lt-picker-label">Ce soir, tu joues à…</div>
                <GameBox game={pickedGame} />
                <div className="lt-picker-title">{pickedGame.title}</div>
                <div className="lt-picker-actions">
                  <button className="lt-import-btn" onClick={pickRandom}>
                    <Dices size={15} /> Repiocher
                  </button>
                  <button
                    className="lt-add-btn"
                    onClick={() => {
                      setSelected(pickedGame);
                      setPickedGame(null);
                    }}
                  >
                    Voir la fiche
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function useIsMobile() {
  const query = "(max-width: 719px)";
  const [mobile, setMobile] = useState(() => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange));
  }, []);
  return mobile;
}

// Bloque le défilement de la page derrière une feuille/modale ouverte
function useScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

function MoreMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="lt-menu-wrap" ref={ref}>
      <button className="lt-icon-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Plus d'actions">
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="lt-menu" role="menu">
          {items.map((it, i) =>
            it.divider ? (
              <hr key={i} />
            ) : (
              <button
                key={i}
                role="menuitem"
                className={it.danger ? "danger" : ""}
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
              >
                {it.icon}
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// Image jamais recadrée : elle s'affiche entière, et la même image floutée comble les bords du cadre.
function CoverImage({ src }) {
  return (
    <span className="lt-img">
      <span className="lt-img-bg" style={{ backgroundImage: `url("${String(src).replace(/"/g, "%22")}")` }} aria-hidden="true" />
      <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
    </span>
  );
}

function GameBox({ game, scale = 1 }) {
  const style = getSpineStyle(game.console);
  const img = firstImage(game);
  return (
    <div className="lt-box-wrap">
      <div className="lt-box" style={{ width: Math.round((style.boxW + style.boxSpine) * scale), height: Math.round(style.boxH * scale) }}>
        <div className="lt-box-spine" style={{ background: style.bg, width: Math.round(style.boxSpine * scale) }}>
          {style.label && (
            <span className="lt-box-spine-label" style={{ color: style.text }}>
              {style.label}
            </span>
          )}
        </div>
        <div className="lt-box-front" style={{ background: style.bg }}>
          {img ? (
            <CoverImage src={img.src} />
          ) : (
            <span className="lt-box-front-title" style={{ color: style.text }}>
              {game.title || "Nouveau jeu"}
            </span>
          )}
        </div>
      </div>
      <div className="lt-box-caption">
        <span>{game.console || "Console ?"}</span>
        {game.year && <span className="lt-box-caption-year">{game.year}</span>}
        {game.metacritic && (
          <span className="lt-metacritic-badge" style={{ background: metacriticColor(game.metacritic) }}>
            {game.metacritic}
          </span>
        )}
        {game.price && <span className="lt-box-caption-price">{game.price}</span>}
        {game.collector && (
          <span className="lt-collector-badge">
            <Star size={9} /> Collector
          </span>
        )}
      </div>
    </div>
  );
}

function GameModal({ game, isNew, consoleOptions, onClose, onSave, onDelete }) {
  const rawImages = normalizeImages(game.images).length ? normalizeImages(game.images) : game.cover ? [{ src: game.cover, position: "center" }] : [];
  const paddedImages = [rawImages[0] || null, rawImages[1] || null, rawImages[2] || null];
  const [form, setForm] = useState({
    ...emptyGame(),
    ...game,
    id: game.id,
    images: paddedImages,
  });
  const [customGenre, setCustomGenre] = useState(!!game.genre && !GENRES.includes(game.genre));
  const [customConsole, setCustomConsole] = useState(!!game.console && !consoleOptions.includes(game.console));
  const coverInputRef = useRef(null);
  const uploadTargetRef = useRef(0);
  const synopsisRef = useRef(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const isMobile = useIsMobile();
  const [saved, setSaved] = useState(!isNew); // le jeu existe déjà dans la collection

  // Échap : ferme d'abord l'image agrandie, puis la fiche
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (lightboxSrc) setLightboxSrc(null);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxSrc, onClose]);

  function autoGrow(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  useEffect(() => {
    autoGrow(synopsisRef.current);
  }, []);

  function update(field, value) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (next.title.trim()) {
      onSave(next);
      setSaved(true);
    }
  }

  function toggleMode(mode) {
    const has = form.modes.includes(mode);
    update("modes", has ? form.modes.filter((m) => m !== mode) : [...form.modes, mode]);
  }

  function triggerUpload(target) {
    uploadTargetRef.current = target;
    coverInputRef.current.click();
  }

  async function handleCoverUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      const target = uploadTargetRef.current;
      if (target === "collector") {
        update("collectorImage", { src: dataUrl, position: "center" });
      } else {
        const next = [...form.images];
        next[target] = { src: dataUrl, position: "center" };
        update("images", next);
      }
    } catch (err) {
      console.error("Erreur image", err);
    }
    e.target.value = "";
  }

  function removeImage(idx) {
    const next = [...form.images];
    next[idx] = null;
    update("images", next);
  }

  function removeCollectorImage() {
    update("collectorImage", null);
  }

  const consoleOk = !!form.console;

  function handleDelete() {
    if (window.confirm(`Supprimer « ${form.title || "ce jeu"} » de ta ludothèque ?`)) onDelete(form.id);
  }

  return (
    <div className="lt-sheet-overlay" onClick={onClose}>
      <div className="lt-sheet" role="dialog" aria-modal="true" aria-label={form.title || "Fiche du jeu"} onClick={(e) => e.stopPropagation()}>
        <div className="lt-sheet-header">
          <button className="lt-icon-btn" onClick={onClose} aria-label="Fermer la fiche">
            <ChevronLeft size={20} className="lt-only-mobile" />
            <X size={18} className="lt-only-desktop" />
          </button>
          <div className="lt-sheet-heading">
            <div className="lt-sheet-kicker">{!saved ? "Nouveau jeu" : consoleOk ? form.console : "Jeu"}</div>
            <div className="lt-sheet-title">{form.title || "Sans titre"}</div>
          </div>
          <div className={"lt-sheet-autosave" + (form.title.trim() ? "" : " warn")}>
            {form.title.trim() ? (
              <>
                <Check size={12} /> Enregistré
              </>
            ) : (
              "Titre requis"
            )}
          </div>
        </div>

        <div className="lt-sheet-scroll">
          <div className="lt-sheet-hero">
            <GameBox game={form} scale={isMobile ? 0.8 : 1} />
            <div className="lt-sheet-hero-main">
              <div className="lt-field">
                <label>Titre</label>
                <input
                  type="text"
                  autoFocus={isNew}
                  placeholder="Titre du jeu"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </div>

              <div className="lt-field">
                <label>Synopsis</label>
                <textarea
                  ref={synopsisRef}
                  className="lt-textarea-auto"
                  placeholder="De quoi ça parle…"
                  value={form.synopsis}
                  onChange={(e) => {
                    update("synopsis", e.target.value);
                    autoGrow(e.target);
                  }}
                />
              </div>

              <div className="lt-field">
                <label>Statut</label>
                <div className="lt-status-btns">
                  {STATUS_ORDER.map((s) => (
                    <button
                      key={s}
                      className={"lt-status-btn" + (form.status === s ? " active" : "")}
                      style={form.status === s ? { background: STATUS[s].color } : {}}
                      onClick={() => update("status", s)}
                    >
                      {STATUS[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {isPlayStationConsole(form.console) && (
                <div className="lt-field" style={{ maxWidth: 260 }}>
                  <label>Platine</label>
                  <button
                    className={"lt-toggle" + (form.platinum ? " active" : "")}
                    onClick={() => update("platinum", !form.platinum)}
                    aria-pressed={form.platinum}
                  >
                    <Trophy size={13} />
                    <span style={{ flex: 1, textAlign: "left" }}>Platine obtenu</span>
                    <span className="lt-toggle-track"><span className="lt-toggle-thumb" /></span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="lt-section">
            <h3 className="lt-section-title">Infos</h3>
            <div className="lt-row">
              <div className="lt-field">
                <label>Console</label>
                <select
                  className="lt-select-full"
                  value={customConsole ? "__custom__" : form.console}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setCustomConsole(true);
                    } else {
                      setCustomConsole(false);
                      update("console", e.target.value);
                    }
                  }}
                >
                  <option value="">—</option>
                  {consoleOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__custom__">Autre…</option>
                </select>
                {customConsole && (
                  <input
                    type="text"
                    style={{ marginTop: 6 }}
                    placeholder="Précise la console"
                    value={consoleOptions.includes(form.console) ? "" : form.console}
                    onChange={(e) => update("console", e.target.value)}
                  />
                )}
              </div>
              <div className="lt-field">
                <label>Année de sortie</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="2023"
                  value={form.year}
                  onChange={(e) => update("year", e.target.value)}
                />
              </div>
            </div>

            <div className="lt-field">
              <label>Genre</label>
              <select
                className="lt-select-full"
                value={customGenre ? "__custom__" : form.genre}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setCustomGenre(true);
                  } else {
                    setCustomGenre(false);
                    update("genre", e.target.value);
                  }
                }}
              >
                <option value="">—</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
                <option value="__custom__">Autre…</option>
              </select>
              {customGenre && (
                <input
                  type="text"
                  style={{ marginTop: 6 }}
                  placeholder="Précise le genre"
                  value={GENRES.includes(form.genre) ? "" : form.genre}
                  onChange={(e) => update("genre", e.target.value)}
                />
              )}
            </div>

            <div className="lt-row">
              <div className="lt-field">
                <label>Mode de jeu</label>
                <div className="lt-status-btns">
                  {MODES.map((m) => (
                    <button
                      key={m}
                      className={"lt-status-btn" + (form.modes.includes(m) ? " active" : "")}
                      style={form.modes.includes(m) ? { background: "#8A9BB8" } : {}}
                      onClick={() => toggleMode(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="lt-field">
                <label>PEGI</label>
                <select className="lt-select-full" value={form.pegi} onChange={(e) => update("pegi", e.target.value)}>
                  <option value="">—</option>
                  {PEGI_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="lt-row">
              <div className="lt-field">
                <label>Metacritic</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="100"
                  placeholder="—"
                  value={form.metacritic}
                  onChange={(e) => update("metacritic", e.target.value)}
                />
              </div>
              <div className="lt-field">
                <label>Prix actuel</label>
                <input type="text" placeholder="35€" value={form.price} onChange={(e) => update("price", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="lt-section">
            <h3 className="lt-section-title">Images</h3>
            <div className="lt-field">
              <label>Jaquette</label>
              <div className="lt-images-row">
                {form.images[0] ? (
                  <div className="lt-image-slot lt-image-slot-filled lt-image-slot-cover">
                    <button className="lt-img-btn" onClick={() => setLightboxSrc(form.images[0].src)} title="Cliquer pour agrandir" aria-label="Agrandir la jaquette">
                      <CoverImage src={form.images[0].src} />
                    </button>
                    <button className="lt-image-remove" onClick={() => removeImage(0)} title="Retirer" aria-label="Retirer la jaquette">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button className="lt-image-slot lt-image-slot-cover lt-image-slot-add" onClick={() => triggerUpload(0)} aria-label="Ajouter une jaquette">
                    <ImageIcon size={16} color="#D4AF37" />
                  </button>
                )}
              </div>
            </div>

            <div className="lt-field">
              <label>Captures d'écran</label>
              <div className="lt-shots-row">
                {[1, 2].map((idx) =>
                  form.images[idx] ? (
                    <div key={idx} className="lt-shot-slot lt-shot-slot-filled">
                      <button className="lt-img-btn" onClick={() => setLightboxSrc(form.images[idx].src)} title="Cliquer pour agrandir" aria-label={`Agrandir la capture ${idx}`}>
                        <CoverImage src={form.images[idx].src} />
                      </button>
                      <button className="lt-image-remove" onClick={() => removeImage(idx)} title="Retirer" aria-label={`Retirer la capture ${idx}`}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button key={idx} className="lt-shot-slot lt-shot-slot-add" onClick={() => triggerUpload(idx)}>
                      <ImageIcon size={18} color="#D4AF37" />
                      <span>Capture {idx}</span>
                    </button>
                  )
                )}
              </div>
              {form.images.some(Boolean) && (
                <div className="lt-image-hint">Touche une image pour l'agrandir. Elle est toujours affichée entière, sans recadrage.</div>
              )}
            </div>
          </div>

          <div className="lt-section">
            <h3 className="lt-section-title">Édition collector</h3>
            <div className="lt-field">
              <button
                className={"lt-toggle" + (form.collector ? " active" : "")}
                onClick={() => update("collector", !form.collector)}
                aria-pressed={form.collector}
              >
                <Star size={13} />
                <span style={{ flex: 1, textAlign: "left" }}>C'est une édition collector</span>
                <span className="lt-toggle-track"><span className="lt-toggle-thumb" /></span>
              </button>
              {form.collector && (
                <div className="lt-collector-block">
                  <textarea
                    className="lt-textarea-auto"
                    placeholder="Contenu du collector : steelbook, artbook, figurine…"
                    value={form.collectorNote}
                    onChange={(e) => {
                      update("collectorNote", e.target.value);
                      autoGrow(e.target);
                    }}
                  />
                  <div className="lt-shots-row" style={{ marginTop: 8 }}>
                    {form.collectorImage ? (
                      <div className="lt-shot-slot lt-shot-slot-filled">
                        <button className="lt-img-btn" onClick={() => setLightboxSrc(form.collectorImage.src)} title="Cliquer pour agrandir" aria-label="Agrandir la photo du collector">
                          <CoverImage src={form.collectorImage.src} />
                        </button>
                        <button className="lt-image-remove" onClick={removeCollectorImage} title="Retirer" aria-label="Retirer la photo du collector">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button className="lt-shot-slot lt-shot-slot-add" onClick={() => triggerUpload("collector")}>
                        <ImageIcon size={18} color="#D4AF37" />
                        <span>Photo du contenu</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lt-section">
            <h3 className="lt-section-title">Notes</h3>
            <div className="lt-field" style={{ marginBottom: 0 }}>
              <textarea
                placeholder="Impressions, où j'en suis, à ne pas oublier…"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>
          </div>

          {saved && (
            <button className="lt-danger-btn" onClick={handleDelete}>
              <Trash2 size={15} /> Supprimer ce jeu
            </button>
          )}

          <input type="file" accept="image/*" ref={coverInputRef} style={{ display: "none" }} onChange={handleCoverUpload} />
        </div>
      </div>

      {lightboxSrc && (
        <div
          className="lt-lightbox"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxSrc(null);
          }}
        >
          <button className="lt-lightbox-close" onClick={() => setLightboxSrc(null)} title="Fermer" aria-label="Fermer l'image">
            <X size={20} />
          </button>
          <img src={lightboxSrc} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function ImportModal({ onClose, onImport }) {
  const [stage, setStage] = useState("upload"); // upload | map | done
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState("");
  const [result, setResult] = useState({ updated: 0, added: 0 });
  const fileInputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
        setError("Impossible de lire des colonnes dans ce fichier.");
        return;
      }
      const initialMapping = {};
      IMPORT_FIELDS.forEach((f) => {
        initialMapping[f.key] = guessColumnFor(f, parsed.meta.fields);
      });
      setHeaders(parsed.meta.fields);
      setRows(parsed.data);
      setMapping(initialMapping);
      setStage("map");
    };
    reader.onerror = () => setError("Erreur de lecture du fichier.");
    reader.readAsText(file);
  }

  function confirmImport() {
    if (!mapping.title) {
      setError("Il faut au moins mapper une colonne pour le Titre.");
      return;
    }
    const newGames = rows
      .map((row) => {
        const title = (row[mapping.title] || "").trim();
        if (!title) return null;
        const ng = { id: uid(), title };
        if (mapping.console) ng.console = (row[mapping.console] || "").trim();
        if (mapping.genre) {
          const rawGenre = (row[mapping.genre] || "").trim();
          ng.genre = harmonizeGenre(rawGenre) || rawGenre;
        }
        if (mapping.year) ng.year = (row[mapping.year] || "").trim();
        if (mapping.status) ng.status = guessStatusKey(row[mapping.status]);
        if (mapping.synopsis) ng.synopsis = (row[mapping.synopsis] || "").trim();
        if (mapping.pegi) ng.pegi = (row[mapping.pegi] || "").trim();
        if (mapping.platinum) ng.platinum = parseBool(row[mapping.platinum]);
        if (mapping.metacritic) ng.metacritic = (row[mapping.metacritic] || "").trim();
        if (mapping.price) ng.price = (row[mapping.price] || "").trim();
        if (mapping.collector) ng.collector = parseBool(row[mapping.collector]);
        if (mapping.collectorNote) ng.collectorNote = (row[mapping.collectorNote] || "").trim();
        if (mapping.cover) {
          const url = (row[mapping.cover] || "").trim();
          if (url) ng.images = [{ src: url, position: "center" }];
        }
        if (mapping.notes) ng.notes = (row[mapping.notes] || "").trim();
        return ng;
      })
      .filter(Boolean);

    const res = onImport(newGames);
    setResult(res || { updated: 0, added: newGames.length });
    setStage("done");
  }

  return (
    <div className="lt-overlay" onClick={onClose}>
      <div className="lt-import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lt-import-header">
          <h2>Importer un CSV</h2>
          <button className="lt-close-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {stage === "upload" && (
          <div className="lt-import-body">
            <p className="lt-import-hint">
              Exporte ta base Airtable en CSV (menu de la vue → Télécharger CSV), puis dépose le fichier ici.
              L'étape suivante te laissera vérifier quelle colonne correspond à quel champ.
            </p>
            <button className="lt-dropzone" onClick={() => fileInputRef.current.click()}>
              <Upload size={22} color="#D4AF37" />
              <span>Choisir un fichier .csv</span>
            </button>
            <input
              type="file"
              accept=".csv,text/csv"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFile}
            />
            {error && <p className="lt-import-error">{error}</p>}
          </div>
        )}

        {stage === "map" && (
          <div className="lt-import-body">
            <p className="lt-import-hint">
              {rows.length} ligne{rows.length > 1 ? "s" : ""} détectée{rows.length > 1 ? "s" : ""}. Associe chaque champ à une colonne du fichier (ou laisse vide pour ignorer).
            </p>
            <div className="lt-mapping-grid">
              {IMPORT_FIELDS.map((f) => (
                <div key={f.key} className="lt-mapping-row">
                  <span className="lt-mapping-label">
                    {f.label}
                    {f.required && <span style={{ color: "#D4AF37" }}> *</span>}
                  </span>
                  <ArrowRight size={13} color="#9C927D" />
                  <select
                    className="lt-select"
                    value={mapping[f.key] || ""}
                    onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                  >
                    <option value="">— Ignorer —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {error && <p className="lt-import-error">{error}</p>}
            <div className="lt-import-actions">
              <button className="lt-import-btn" onClick={() => setStage("upload")}>Retour</button>
              <button className="lt-add-btn" onClick={confirmImport}>
                Importer {rows.length} jeu{rows.length > 1 ? "x" : ""}
              </button>
            </div>
          </div>
        )}

        {stage === "done" && (
          <div className="lt-import-body">
            <div className="lt-import-success">
              <Check size={22} color="#7FA06A" />
              <span>
                {result.added > 0 && <>{result.added} jeu{result.added > 1 ? "x" : ""} ajouté{result.added > 1 ? "s" : ""}. </>}
                {result.updated > 0 && <>{result.updated} jeu{result.updated > 1 ? "x" : ""} mis à jour.</>}
                {result.added === 0 && result.updated === 0 && <>Rien à importer.</>}
              </span>
            </div>
            <div className="lt-import-actions">
              <button className="lt-add-btn" onClick={onClose}>Fermer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="lt-root">
      <style>{GLOBAL_CSS}</style>
      <div className="lt-login-wrap">
        <form className="lt-login-card" onSubmit={submit}>
          <h1>
            <Gamepad2 size={24} color="#D4AF37" /> Ma ludothèque
          </h1>
          {status === "sent" ? (
            <div className="lt-login-sent">
              <Mail size={18} color="#D4AF37" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Lien envoyé à <b>{email}</b>. Ouvre ce mail (pense aux spams) et clique sur le lien : tu seras connectée.
              </span>
            </div>
          ) : (
            <>
              <p>Connecte-toi par email pour retrouver ta collection sur tous tes appareils. Pas de mot de passe : je t'envoie un lien.</p>
              <input
                type="email"
                required
                autoFocus
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="lt-add-btn" disabled={status === "sending"}>
                {status === "sending" ? "Envoi…" : "Recevoir le lien de connexion"}
              </button>
              {status === "error" && <div className="lt-login-error">{errorMsg}</div>}
            </>
          )}
        </form>
      </div>
    </div>
  );
}

function ConfigMissing() {
  return (
    <div className="lt-root">
      <style>{GLOBAL_CSS}</style>
      <div className="lt-login-wrap">
        <div className="lt-login-card">
          <h1>Configuration manquante</h1>
          <p>
            Les variables <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> ne sont pas définies.
            En local, mets-les dans un fichier <code>.env.local</code> ; sur Vercel, dans Settings → Environment Variables (puis redéploie).
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = chargement, null = déconnecté

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!supabaseConfigured) return <ConfigMissing />;
  if (session === undefined) {
    return (
      <div className="lt-root">
        <style>{GLOBAL_CSS}</style>
        <div className="lt-login-wrap" style={{ color: "var(--text-muted)" }}>Chargement…</div>
      </div>
    );
  }
  if (!session) return <LoginScreen />;
  return <Ludotheque key={session.user.id} user={session.user} onSignOut={() => supabase.auth.signOut()} />;
}
