/** Raretés, de la plus courante à la plus rare. */
export const RARETES = ['commune', 'rare', 'ultra_rare', 'super_rare', 'legendaire'];
export const TYPES = ['personnalite', 'lieu', 'histoire', 'science', 'culture', 'nature'];

export const JEU = {
  intervalleRechargeMs: 60 * 60 * 1000,
  paquetsMax: 10,
  paquetsDepart: 10,
  piecesDepart: 0,
  cartesParPaquet: 5,
  taux: { commune: 60, rare: 25, ultra_rare: 10, super_rare: 4, legendaire: 1 },
  pitie: 50,
  prixRevente: { commune: 5, rare: 15, ultra_rare: 40, super_rare: 100, legendaire: 300 },
  prixPaquet: 100,
  catalogue: {
    n: 50000,
    longueurMin: 2000,
    parts: { legendaire: 0.01, super_rare: 0.04, ultra_rare: 0.10, rare: 0.25, commune: 0.60 },
    seuilVuesMensuelles: 300,
  },
};
