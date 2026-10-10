export function lots(tableau, taille) {
  const resultat = [];
  for (let i = 0; i < tableau.length; i += taille) resultat.push(tableau.slice(i, i + taille));
  return resultat;
}
