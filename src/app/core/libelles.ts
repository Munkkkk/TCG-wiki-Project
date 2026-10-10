import { Rarete, TypeCarte } from './modeles';

export const RARETES: Rarete[] = ['legendaire', 'super_rare', 'ultra_rare', 'rare', 'commune'];
export const TYPES: TypeCarte[] = ['personnalite', 'lieu', 'histoire', 'science', 'culture', 'nature'];

export const LIBELLES_RARETE: Record<Rarete, string> = {
  commune: 'Commune', rare: 'Rare', ultra_rare: 'Ultra Rare', super_rare: 'Super Rare', legendaire: 'Légendaire',
};
export const LIBELLES_TYPE: Record<TypeCarte, string> = {
  personnalite: 'Personnalité', lieu: 'Lieu', histoire: 'Histoire', science: 'Science', culture: 'Culture', nature: 'Nature',
};
