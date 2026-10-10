export type Rarete = 'commune' | 'rare' | 'ultra_rare' | 'super_rare' | 'legendaire';
export type TypeCarte = 'personnalite' | 'lieu' | 'histoire' | 'science' | 'culture' | 'nature';

export interface Carte {
  id: number;
  pageId: number;
  titre: string;
  extrait: string;
  imageUrl: string | null;
  type: TypeCarte;
  rarete: Rarete;
  attaque: number;
  defense: number;
}
export interface CarteAlbum extends Carte { quantite: number; epinglee: boolean; }
export interface CarteDetail extends CarteAlbum { actif: boolean; }

export interface Moi {
  id: number;
  pseudo: string;
  email: string;
  pieces: number;
  paquetsStockes: number;
  paquetsMax: number;
  prochainPaquetDansMs: number | null;
  paquetsAvantPitie: number;
  venteAutoCommunes: boolean;
}

export interface ResultatOuverture {
  cartes: (Carte & { nouvelle: boolean })[];
  etat: Moi;
  venteAuto: { cartes: number; pieces: number } | null;
}

export interface FiltresAlbum {
  raretes: Rarete[];
  types: TypeCarte[];
  q: string;
  manquantes: boolean;
  page: number;
}

export interface PageAlbum {
  cartes: CarteAlbum[];
  total: number;
  page: number;
  parPage: number;
  possedees: number;
  tailleCatalogue: number;
}

export interface Doublon {
  carteId: number;
  titre: string;
  rarete: Rarete;
  type: TypeCarte;
  imageUrl: string | null;
  vendables: number;
  prixUnitaire: number;
}

export interface ResultatVente { cartesVendues: number; piecesGagnees: number; pieces: number; }
