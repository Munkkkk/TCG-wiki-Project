export type Icone = 'paquets' | 'album' | 'doublons' | 'profil' | 'duels' | 'marche' | 'amis' | 'guilde' | 'classement';

export interface EntreeMenu {
  libelle: string;
  icone: Icone;
  /** null = section pas encore disponible (« Bientôt »). */
  route: string | null;
}

/** Ajouter une section = ajouter une ligne ; passer `route` de null à son chemin quand elle est prête. */
export const MENU: EntreeMenu[] = [
  { libelle: 'Paquets', icone: 'paquets', route: '/paquets' },
  { libelle: 'Album', icone: 'album', route: '/album' },
  { libelle: 'Doublons', icone: 'doublons', route: '/doublons' },
  { libelle: 'Duels', icone: 'duels', route: null },
  { libelle: 'Marché', icone: 'marche', route: null },
  { libelle: 'Amis', icone: 'amis', route: null },
  { libelle: 'Guilde', icone: 'guilde', route: null },
  { libelle: 'Classement', icone: 'classement', route: null },
];
