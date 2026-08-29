import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, X, Trash2, Gamepad2, Upload, ArrowRight, Check, Trophy, Image as ImageIcon, Dices, Download, Star, Layers } from "lucide-react";
import Papa from "papaparse";

const STATUS = {
  wishlist: { label: "Envie", color: "#8B7BB0" },
  backlog: { label: "À faire", color: "#7A7264" },
  playing: { label: "En cours", color: "#D4AF37" },
  done: { label: "Terminé", color: "#7FA06A" },
  dropped: { label: "Abandonné", color: "#A65B4C" },
};
const STATUS_ORDER = ["wishlist", "backlog", "playing", "done", "dropped"];

const CONSOLE_PRESETS = [
  "PS5", "PS4", "PS3", "PS2", "PS1", "PSP", "Nintendo Switch", "Nintendo Switch 2", "Wii", "Wii U",
  "Xbox Series X|S", "Xbox One", "PC", "Steam Deck", "3DS", "DS", "GBA", "Rétro",
];

const SPINE_PALETTE = ["#B33A3A", "#3A5FB3", "#3AA65C", "#B38A3A", "#7B5FB3", "#3AA6A0", "#B3563A", "#5F8AB3", "#A6763A", "#3AB38F"];

const GENRES = [
  "Action", "Aventure", "RPG", "Action-RPG", "Tactical-RPG", "Plateforme",
  "FPS", "TPS", "Beat'em up", "Hack and slash", "Metroidvania", "Souls-like",
  "Survival horror", "Horreur", "Stratégie", "STR (temps réel)", "Tour par tour",
  "Gestion / Simulation", "City builder", "Simulation de vie", "Sport", "Course",
  "Combat", "Puzzle / Réflexion", "Rythme", "Party game", "Visual novel",
  "Roguelike / Roguelite", "Sandbox", "MMO", "Battle royale", "Idle",
];

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
  { key: "progression", label: "Progression", guesses: ["progression", "progress", "avancement", "%"] },
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
    wishlist: ["envie", "wishlist", "à acheter", "a acheter", "souhait"],
    backlog: ["à faire", "a faire", "backlog", "todo", "non commencé", "non commence"],
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
  progression: 0,
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

export default function Ludotheque() {
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
  const [groupByConsole, setGroupByConsole] = useState(false);
  const backupInputRef = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ludotheque-games");
      setGames(raw ? JSON.parse(raw) : []);
    } catch (e) {
      setGames([]);
    }
  }, []);

  function persist(next) {
    setGames(next);
    setSaving(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem("ludotheque-games", JSON.stringify(next));
      } catch (e) {
        console.error("Erreur de sauvegarde", e);
      } finally {
        setSaving(false);
      }
    }, 300);
  }

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
          persist(parsed);
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
    return Array.from(new Set(games.map((g) => g.console).filter(Boolean))).sort();
  }, [games]);

  const filtered = useMemo(() => {
    if (!games) return [];
    let list = games.filter((g) => {
      const matchSearch = g.title.toLowerCase().includes(search.toLowerCase());
      const matchConsole = !filterConsole || g.console === filterConsole;
      const matchStatus = !filterStatus || g.status === filterStatus;
      return matchSearch && matchConsole && matchStatus;
    });
    list.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "console") return (a.console || "").localeCompare(b.console || "");
      if (sortBy === "status") return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      return 0;
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

  const groupedByConsole = useMemo(() => {
    const map = new Map();
    filtered.forEach((g) => {
      const key = g.console || "Sans console";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(g);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  function renderSpine(g) {
    const style = getSpineStyle(g.console);
    return (
      <div
        key={g.id}
        className="lt-spine"
        style={{ background: style.bg, width: style.width, height: style.height }}
        onClick={() => setSelected(g)}
        title={g.title}
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

  return (
    <div className="lt-root">
      <style>{`
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
        .lt-shelf-groups {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .lt-shelf-group-header {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
          margin-bottom: 14px;
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .lt-shelf-group-header span {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          color: var(--gold);
          font-weight: 700;
          font-size: 12px;
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
        .lt-spine:hover {
          transform: translateY(-8px);
          box-shadow: inset -3px 0 6px rgba(0,0,0,0.35), 0 10px 16px rgba(0,0,0,0.5);
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
        .lt-box-front-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
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
        .lt-progress-row { display: flex; align-items: center; gap: 10px; }
        .lt-progress-row input[type="range"] { flex: 1; accent-color: var(--gold); }
        .lt-progress-val {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 12px;
          color: var(--gold);
          width: 38px;
          text-align: right;
        }
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
        .lt-image-slot img { width: 100%; height: 100%; object-fit: cover; display: block; cursor: pointer; }
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
        .lt-shot-slot img { width: 100%; height: 100%; object-fit: cover; display: block; cursor: pointer; }
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
        .lt-image-pos-badge {
          position: absolute;
          bottom: 2px;
          left: 2px;
          background: rgba(0,0,0,0.65);
          color: var(--gold);
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 9px;
          font-weight: 700;
          border-radius: 3px;
          padding: 0px 4px;
          cursor: pointer;
          border: none;
          z-index: 2;
        }
        .lt-image-pos-badge:hover { background: rgba(0,0,0,0.85); }
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
          max-width: 900px;
          max-height: 90vh;
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
        @media (max-width: 560px) {
          .lt-modal { flex-direction: column; max-height: 92vh; }
          .lt-box-wrap { width: 100%; flex-direction: row; padding: 16px; }
        }
      `}</style>

      <div className="lt-header">
        <div>
          <h1 className="lt-title">
            <Gamepad2 size={26} color="#D4AF37" />
            Ma ludothèque
            {games && <span className="badge">{games.length}</span>}
          </h1>
          {games && (
            <div className="lt-stats" style={{ marginTop: 8 }}>
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
        <div className="lt-save-indicator">{saving ? "Enregistrement…" : games ? "Enregistré" : ""}</div>
      </div>

      {games && (
        <div className="lt-toolbar">
          <div className="lt-search">
            <Search size={15} color="#9C927D" />
            <input
              placeholder="Rechercher un jeu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="lt-select" value={filterConsole} onChange={(e) => setFilterConsole(e.target.value)}>
            <option value="">Toutes consoles</option>
            {consoles.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className="lt-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tous statuts</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS[s].label}</option>
            ))}
          </select>
          <select className="lt-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="title">Trier : titre</option>
            <option value="console">Trier : console</option>
            <option value="status">Trier : statut</option>
          </select>
          <button
            className={"lt-import-btn" + (groupByConsole ? " lt-toggle-active" : "")}
            onClick={() => setGroupByConsole((v) => !v)}
            title="Grouper l'étagère par console"
          >
            <Layers size={15} /> Grouper
          </button>
          <button className="lt-import-btn" onClick={() => setImporting(true)}>
            <Upload size={15} /> Importer CSV
          </button>
          <button className="lt-import-btn" onClick={pickRandom}>
            <Dices size={15} /> Pioche aléatoire
          </button>
          <button className="lt-add-btn" onClick={() => setCreating(true)}>
            <Plus size={15} /> Ajouter un jeu
          </button>
          <button className="lt-icon-btn" onClick={exportBackup} title="Exporter un backup">
            <Download size={15} />
          </button>
          <button className="lt-icon-btn" onClick={() => backupInputRef.current.click()} title="Restaurer un backup">
            <Upload size={15} />
          </button>
          <input type="file" accept=".json" ref={backupInputRef} style={{ display: "none" }} onChange={restoreBackup} />
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

      {games && filtered.length > 0 && !groupByConsole && (
        <div className="lt-shelf">
          {filtered.map((g) => renderSpine(g))}
        </div>
      )}

      {games && filtered.length > 0 && groupByConsole && (
        <div className="lt-shelf-groups">
          {groupedByConsole.map(([consoleName, gamesInGroup]) => (
            <div key={consoleName} className="lt-shelf-group">
              <div className="lt-shelf-group-header">
                {consoleName} <span>{gamesInGroup.length}</span>
              </div>
              <div className="lt-shelf">{gamesInGroup.map((g) => renderSpine(g))}</div>
            </div>
          ))}
        </div>
      )}

      {(selected || creating) && (
        <GameModal
          game={selected || emptyGame()}
          isNew={!!creating}
          consoleOptions={Array.from(new Set([...consoles, ...CONSOLE_PRESETS])).sort()}
          onClose={() => {
            setSelected(null);
            setCreating(false);
          }}
          onSave={(g) => {
            upsertGame(g);
          }}
          onDelete={(id) => deleteGame(id)}
        />
      )}

      {importing && (
        <ImportModal onClose={() => setImporting(false)} onImport={importGames} />
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

function GameBox({ game }) {
  const style = getSpineStyle(game.console);
  const img = game.images && game.images[0];
  return (
    <div className="lt-box-wrap">
      <div className="lt-box" style={{ width: style.boxW + style.boxSpine, height: style.boxH }}>
        <div className="lt-box-spine" style={{ background: style.bg, width: style.boxSpine }}>
          {style.label && (
            <span className="lt-box-spine-label" style={{ color: style.text }}>
              {style.label}
            </span>
          )}
        </div>
        <div className="lt-box-front" style={{ background: style.bg }}>
          {img ? (
            <img
              src={img.src}
              alt=""
              className="lt-box-front-img"
              style={{ objectPosition: img.position === "top" ? "center top" : img.position === "bottom" ? "center bottom" : "center center" }}
            />
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
    if (next.title.trim()) onSave(next);
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

  function cycleImagePosition(idx) {
    const order = ["center", "top", "bottom"];
    const cur = form.images[idx];
    if (!cur) return;
    const next = [...form.images];
    const i = order.indexOf(cur.position || "center");
    next[idx] = { ...cur, position: order[(i + 1) % order.length] };
    update("images", next);
  }

  function removeCollectorImage() {
    update("collectorImage", null);
  }

  function cycleCollectorImagePosition() {
    if (!form.collectorImage) return;
    const order = ["center", "top", "bottom"];
    const i = order.indexOf(form.collectorImage.position || "center");
    update("collectorImage", { ...form.collectorImage, position: order[(i + 1) % order.length] });
  }

  return (
    <div className="lt-overlay" onClick={onClose}>
      <div className="lt-modal" onClick={(e) => e.stopPropagation()}>
        <GameBox game={form} />
        <div className="lt-modal-body">
          <div className="lt-modal-body-header">
            <div className="lt-field" style={{ flex: 1, marginBottom: 0 }}>
              <label>Titre</label>
              <input
                type="text"
                autoFocus
                placeholder="Titre du jeu"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {!isNew && (
                <button className="lt-delete-btn" onClick={() => onDelete(form.id)} title="Supprimer">
                  <Trash2 size={15} />
                </button>
              )}
              <button className="lt-close-btn" onClick={onClose} title="Fermer">
                <X size={15} />
              </button>
            </div>
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
              <select
                className="lt-select-full"
                value={form.pegi}
                onChange={(e) => update("pegi", e.target.value)}
              >
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
                min="0"
                max="100"
                placeholder="—"
                value={form.metacritic}
                onChange={(e) => update("metacritic", e.target.value)}
              />
            </div>
            <div className="lt-field">
              <label>Prix actuel</label>
              <input
                type="text"
                placeholder="35€"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
              />
            </div>
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

          <div className="lt-row">
            <div className="lt-field" style={{ flex: 2 }}>
              <label>Progression</label>
              <div className="lt-progress-row">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.progression}
                  onChange={(e) => update("progression", Number(e.target.value))}
                />
                <span className="lt-progress-val">{form.progression}%</span>
              </div>
            </div>
            {isPlayStationConsole(form.console) && (
              <div className="lt-field">
                <label>Platine</label>
                <button
                  className={"lt-toggle" + (form.platinum ? " active" : "")}
                  onClick={() => update("platinum", !form.platinum)}
                >
                  <Trophy size={13} />
                  <span className="lt-toggle-track"><span className="lt-toggle-thumb" /></span>
                </button>
              </div>
            )}
          </div>

          <div className="lt-field">
            <label>Jaquette</label>
            <div className="lt-images-row">
              {form.images[0] ? (
                <div className="lt-image-slot lt-image-slot-filled lt-image-slot-cover">
                  <img
                    src={form.images[0].src}
                    alt=""
                    style={{
                      objectPosition: form.images[0].position === "top" ? "center top" : form.images[0].position === "bottom" ? "center bottom" : "center center",
                    }}
                    onClick={() => setLightboxSrc(form.images[0].src)}
                    title="Cliquer pour agrandir"
                  />
                  <button
                    className="lt-image-pos-badge"
                    onClick={(e) => {
                      e.stopPropagation();
                      cycleImagePosition(0);
                    }}
                    title="Ajuster le cadrage (haut / centre / bas)"
                  >
                    {form.images[0].position === "top" ? "H" : form.images[0].position === "bottom" ? "B" : "C"}
                  </button>
                  <button className="lt-image-remove" onClick={() => removeImage(0)} title="Retirer">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button className="lt-image-slot lt-image-slot-cover lt-image-slot-add" onClick={() => triggerUpload(0)}>
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
                    <img
                      src={form.images[idx].src}
                      alt=""
                      style={{
                        objectPosition:
                          form.images[idx].position === "top" ? "center top" : form.images[idx].position === "bottom" ? "center bottom" : "center center",
                      }}
                      onClick={() => setLightboxSrc(form.images[idx].src)}
                      title="Cliquer pour agrandir"
                    />
                    <button
                      className="lt-image-pos-badge"
                      onClick={(e) => {
                        e.stopPropagation();
                        cycleImagePosition(idx);
                      }}
                      title="Ajuster le cadrage (haut / centre / bas)"
                    >
                      {form.images[idx].position === "top" ? "H" : form.images[idx].position === "bottom" ? "B" : "C"}
                    </button>
                    <button className="lt-image-remove" onClick={() => removeImage(idx)} title="Retirer">
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
            <div className="lt-image-hint">Clique sur une image pour l'agrandir, sur le badge H/C/B pour ajuster le cadrage</div>
            <input
              type="file"
              accept="image/*"
              ref={coverInputRef}
              style={{ display: "none" }}
              onChange={handleCoverUpload}
            />
          </div>

          <div className="lt-field">
            <label>
              <button
                className={"lt-toggle lt-toggle-inline" + (form.collector ? " active" : "")}
                onClick={() => update("collector", !form.collector)}
              >
                <Star size={13} />
                <span className="lt-toggle-track"><span className="lt-toggle-thumb" /></span>
              </button>
              {" "}Édition collector
            </label>
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
                      <img
                        src={form.collectorImage.src}
                        alt=""
                        style={{
                          objectPosition:
                            form.collectorImage.position === "top" ? "center top" : form.collectorImage.position === "bottom" ? "center bottom" : "center center",
                        }}
                        onClick={() => setLightboxSrc(form.collectorImage.src)}
                        title="Cliquer pour agrandir"
                      />
                      <button
                        className="lt-image-pos-badge"
                        onClick={(e) => {
                          e.stopPropagation();
                          cycleCollectorImagePosition();
                        }}
                        title="Ajuster le cadrage (haut / centre / bas)"
                      >
                        {form.collectorImage.position === "top" ? "H" : form.collectorImage.position === "bottom" ? "B" : "C"}
                      </button>
                      <button className="lt-image-remove" onClick={removeCollectorImage} title="Retirer">
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

          <div className="lt-field">
            <label>Notes</label>
            <textarea
              placeholder="Impressions, où j'en suis, à ne pas oublier…"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>
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
          <button className="lt-lightbox-close" onClick={() => setLightboxSrc(null)} title="Fermer">
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
        if (mapping.genre) ng.genre = (row[mapping.genre] || "").trim();
        if (mapping.year) ng.year = (row[mapping.year] || "").trim();
        if (mapping.status) ng.status = guessStatusKey(row[mapping.status]);
        if (mapping.progression) {
          const rawProgress = String(row[mapping.progression] || "").replace("%", "").trim();
          let progression = parseInt(rawProgress, 10);
          if (!isNaN(progression)) ng.progression = Math.max(0, Math.min(100, progression));
        }
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
