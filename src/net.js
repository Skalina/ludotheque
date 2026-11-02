// Sur un réseau très faible, une requête peut rester en attente de longues minutes et bloquer la mise à jour.
// Au bout de ce délai, elle est abandonnée : l'app passe en « hors ligne » et réessaie plus tard.
export function makeFetchWithTimeout(ms) {
  return (input, init = {}) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    if (init.signal) {
      if (init.signal.aborted) ctrl.abort();
      else init.signal.addEventListener("abort", () => ctrl.abort());
    }
    return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
  };
}
