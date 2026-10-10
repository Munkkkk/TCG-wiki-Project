function nbInferieurs(trie, valeur) {
  let bas = 0;
  let haut = trie.length;
  while (bas < haut) {
    const milieu = (bas + haut) >> 1;
    if (trie[milieu] < valeur) bas = milieu + 1;
    else haut = milieu;
  }
  return bas;
}

export function percentiles(valeurs) {
  if (valeurs.length <= 1) return valeurs.map(() => 1);
  const trie = [...valeurs].sort((a, b) => a - b);
  return valeurs.map((v) => nbInferieurs(trie, v) / (valeurs.length - 1));
}

export const versStat = (p) => 1 + Math.round(99 * Math.min(1, Math.max(0, p)));

const SCORE_LABEL = { qualite: 1, bon: 0.6 };
export const calculerDefense = (pLiens, label) => versStat(0.6 * pLiens + 0.4 * (SCORE_LABEL[label] ?? 0));

const ORDRE = ['legendaire', 'super_rare', 'ultra_rare', 'rare', 'commune'];

export function raretePourRang(n, parts) {
  let cumul = 0;
  const seuils = ORDRE.map((rarete) => {
    cumul += parts[rarete];
    return [rarete, Math.round(n * cumul)];
  });
  return (index) => seuils.find(([, seuil]) => index < seuil)?.[0] ?? 'commune';
}
