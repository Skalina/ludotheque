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

  for (const chunk of chunkBySize(changed)) {
    const now = new Date().toISOString();
    const rows = chunk.map((g) => ({ user_id: userId, id: g.id, data: g, updated_at: now }));
    const { error } = await supabase.from("games").upsert(rows, { onConflict: "user_id,id" });
    if (error) throw error;
    chunk.forEach((g) => synced.set(g.id, g));
  }

  for (let i = 0; i < removed.length; i += 50) {
    const ids = removed.slice(i, i + 50);
    const { error } = await supabase.from("games").delete().eq("user_id", userId).in("id", ids);
    if (error) throw error;
    ids.forEach((id) => synced.delete(id));
  }

  return { upserted: changed.length, deleted: removed.length };
}
