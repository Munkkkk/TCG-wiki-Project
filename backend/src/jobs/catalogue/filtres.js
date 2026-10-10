const ESPACES_EXCLUS = new Set([
  'Spécial', 'Special', 'Fichier', 'File', 'Catégorie', 'Category', 'Wikipédia', 'Wikipedia',
  'Portail', 'Modèle', 'Template', 'Aide', 'Help', 'Projet', 'Utilisateur', 'User', 'Discussion',
  'Talk', 'Média', 'Module', 'MediaWiki', 'Référence', 'Sujet',
]);
const MOIS = 'janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre';
const MOTIFS_EXCLUS = [
  /^Liste (de|des|du|d')/i,
  /^\d{1,4}$/,
  new RegExp(`^(1er|\\d{1,2}) (${MOIS})$`, 'i'),
  new RegExp(`^(${MOIS}) \\d{1,4}$`, 'i'),
  /^(Naissance|Décès) en /i,
  /^\d{1,4} en /i,
];

export function estTitreCandidat(titre) {
  if (!titre || titre === '-') return false;
  const prefixe = titre.split(':')[0];
  if (titre.includes(':') && ESPACES_EXCLUS.has(prefixe)) return false;
  return !MOTIFS_EXCLUS.some((motif) => motif.test(titre));
}

export function estArticleValide(meta, longueurMin) {
  return meta.existe && meta.ns === 0 && !meta.redirection && !meta.homonymie && meta.longueur >= longueurMin;
}
