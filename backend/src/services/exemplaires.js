export async function compterExemplaires(db, joueurId, carteId) {
  const [[ligne]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM cartes_joueur WHERE joueur_id = ? AND carte_id = ?) AS possedes,
       EXISTS(SELECT 1 FROM epingles WHERE joueur_id = ? AND carte_id = ?) AS epinglee`,
    [joueurId, carteId, joueurId, carteId],
  );
  return { possedes: Number(ligne.possedes), epinglee: Boolean(ligne.epinglee) };
}

export function nbVendables({ possedes, epinglee }) {
  return epinglee ? 0 : Math.max(0, possedes - 1);
}

/** Supprime les n exemplaires les plus récents. */
export async function retirerExemplaires(conn, joueurId, carteId, n) {
  if (n <= 0) return 0;
  const [r] = await conn.query(
    'DELETE FROM cartes_joueur WHERE joueur_id = ? AND carte_id = ? ORDER BY obtenue_le DESC, id DESC LIMIT ?',
    [joueurId, carteId, n],
  );
  return r.affectedRows;
}
