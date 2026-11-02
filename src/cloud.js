// Sync cloud : un jeu = une ligne dans la table "games" (user_id, id, data jsonb).
// On n'envoie que les jeux modifiés, par petits lots, pour éviter de renvoyer
// toute la collection (images comprises) à chaque modification.

const PAGE_SIZE = 50;

export async function fetchAllGames(supabase) {
  const all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("games")
      .select("id, data")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    data.forEach((row) => all.push({ ...row.data, id: row.id }));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

// Date de dernière modification côté cloud -> nombre (ms). Les microsecondes de Postgres sont tronquées : certains
// navigateurs (Safari) ne les acceptent pas. Si l'analyse échoue, on garde le texte brut (comparable tel quel).
export function stampOf(value) {
  const t = Date.parse(String(value).replace(/(\.\d{3})\d+/, "$1"));
  return Number.isNaN(t) ? String(value) : t;
}

// Lecture LÉGÈRE : seulement (id, date de modification) de chaque jeu, soit quelques Ko pour toute la collection.
// Comparée aux dates déjà connues sur l'appareil, elle dit exactement quelles fiches télécharger.
export async function fetchStamps(supabase) {
  const out = new Map();
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from("games").select("id, updated_at").order("id").range(from, from + PAGE - 1);
    if (error) throw error;
    data.forEach((r) => out.set(r.id, stampOf(r.updated_at)));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

// Télécharge seulement les fiches demandées (par petits lots, images comprises).
export async function fetchGamesByIds(supabase, ids, onProgress) {
  const out = [];
  const CHUNK = 10; // petits lots : sur un réseau faible, une réponse plus légère a plus de chances d'aboutir
  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("games").select("id, data, updated_at").in("id", part);
    if (error) throw error;
    data.forEach((r) => out.push({ game: { ...r.data, id: r.id }, stamp: stampOf(r.updated_at) }));
    if (onProgress) onProgress(Math.min(i + CHUNK, ids.length));
  }
  return out;
}

export function diffGames(synced, next) {
  const unique = Array.from(new Map(next.map((g) => [g.id, g])).values());
  const changed = unique.filter((g) => synced.get(g.id) !== g);
  const ids = new Set(unique.map((g) => g.id));
  const removed = Array.from(synced.keys()).filter((id) => !ids.has(id));
  return { changed, removed };
}

export function chunkBySize(items, maxChars = 900000, maxCount = 25) {
  const chunks = [];
  let current = [];
  let size = 0;
  for (const item of items) {
    const len = JSON.stringify(item).length;
    if (current.length && (size + len > maxChars || current.length >= maxCount)) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += len;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

// `synced` (Map id -> objet jeu) est mis à jour au fur et à mesure : si un lot
// échoue, un nouvel appel reprend là où ça s'est arrêté.
export async function pushChanges(supabase, userId, synced, next) {
  const { changed, removed } = diffGames(synced, next);
  const stamps = new Map(); // id -> date écrite (ms) : nos propres envois ne seront jamais retéléchargés
  const removedIds = [];

  for (const chunk of chunkBySize(changed)) {
    const now = new Date().toISOString();
    const rows = chunk.map((g) => ({ user_id: userId, id: g.id, data: g, updated_at: now }));
    const { error } = await supabase.from("games").upsert(rows, { onConflict: "user_id,id" });
    if (error) throw error;
    chunk.forEach((g) => {
      synced.set(g.id, g);
      stamps.set(g.id, stampOf(now));
    });
  }

  for (let i = 0; i < removed.length; i += 50) {
    const ids = removed.slice(i, i + 50);
    const { error } = await supabase.from("games").delete().eq("user_id", userId).in("id", ids);
    if (error) throw error;
    ids.forEach((id) => {
      synced.delete(id);
      removedIds.push(id);
    });
  }

  return { upserted: changed.length, deleted: removed.length, stamps, removedIds };
}
