export function moisPrecedents(maintenant, nb) {
  const res = [];
  for (let i = 1; i <= nb; i++) {
    const d = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - i, 1));
    res.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return res;
}

/** Source rapide (dev / premier lancement) : top 1000 mensuel de l'API Wikimedia. */
export async function vuesDepuisTop(client, maintenant, nbMois) {
  const vues = new Map();
  for (const mois of moisPrecedents(maintenant, nbMois)) {
    for (const { titre, vues: v } of await client.topMensuel(mois)) vues.set(titre, (vues.get(titre) ?? 0) + v);
  }
  return vues;
}
