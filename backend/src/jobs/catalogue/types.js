/** Nature de l'élément (Wikidata P31) → type. Table extensible. */
const P31 = {
  personnalite: ['Q5'],
  lieu: ['Q515', 'Q6256', 'Q3624078', 'Q484170', 'Q8502', 'Q4022', 'Q23397', 'Q23442', 'Q5107',
    'Q1549591', 'Q41176', 'Q839954', 'Q747074', 'Q1093829', 'Q35657', 'Q486972'],
  histoire: ['Q178561', 'Q198', 'Q1190554', 'Q13418847', 'Q3024240', 'Q11514315', 'Q48349'],
  science: ['Q11344', 'Q11173', 'Q12136', 'Q9143', 'Q11862829', 'Q7187', 'Q8054'],
  culture: ['Q11424', 'Q7725634', 'Q482994', 'Q7366', 'Q5398426', 'Q7889', 'Q215380', 'Q3305213', 'Q476028'],
  nature: ['Q16521'],
};
const TYPE_PAR_QID = new Map(Object.entries(P31).flatMap(([type, qids]) => qids.map((q) => [q, type])));

const REGLES_CATEGORIES = [
  [/^Catégorie:(Naissance|Décès) /, 'personnalite'],
  [/(Commune|Ville|Village|Pays|Île|Montagne|Fleuve|Rivière|Lac|Région|Département|Monument|Château)/i, 'lieu'],
  [/(Bataille|Guerre|Révolution|Empire|Royaume|Dynastie|Traité|Histoire)/i, 'histoire'],
  [/(Espèce|Animal|Plante|Mammifère|Oiseau|Poisson|Insecte|Taxon|Champignon)/i, 'nature'],
  [/(Physique|Chimie|Mathématiques|Médecine|Maladie|Biologie|Informatique|Astronomie|Technologie)/i, 'science'],
];

export function typeDepuisP31(qids) {
  for (const q of qids) if (TYPE_PAR_QID.has(q)) return TYPE_PAR_QID.get(q);
  return null;
}

export function typeDepuisCategories(categories) {
  for (const [motif, type] of REGLES_CATEGORIES) if (categories.some((c) => motif.test(c))) return type;
  return null;
}

export function determinerType(qids, categories) {
  return typeDepuisP31(qids) ?? typeDepuisCategories(categories) ?? 'culture';
}
