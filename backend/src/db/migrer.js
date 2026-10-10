const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS joueurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe_hash VARCHAR(100) NOT NULL,
    pseudo VARCHAR(20) NOT NULL UNIQUE,
    pieces INT NOT NULL DEFAULT 0,
    paquets_stockes INT NOT NULL DEFAULT 10,
    dernier_calcul DATETIME(3) NOT NULL,
    paquets_sans_legendaire INT NOT NULL DEFAULT 0,
    vente_auto_communes TINYINT(1) NOT NULL DEFAULT 0,
    cree_le DATETIME(3) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
  `CREATE TABLE IF NOT EXISTS catalogue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id INT NOT NULL UNIQUE,
    titre VARCHAR(255) NOT NULL,
    extrait TEXT,
    image_url VARCHAR(1000),
    type ENUM('personnalite','lieu','histoire','science','culture','nature') NOT NULL,
    rarete ENUM('commune','rare','ultra_rare','super_rare','legendaire') NOT NULL,
    attaque TINYINT UNSIGNED NOT NULL,
    defense TINYINT UNSIGNED NOT NULL,
    rang INT NOT NULL,
    vues_12_mois BIGINT NOT NULL,
    actif TINYINT(1) NOT NULL DEFAULT 1,
    maj_le DATETIME(3) NOT NULL,
    INDEX idx_actif_rarete (actif, rarete)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
  `CREATE TABLE IF NOT EXISTS cartes_joueur (
    id INT AUTO_INCREMENT PRIMARY KEY,
    joueur_id INT NOT NULL,
    carte_id INT NOT NULL,
    obtenue_le DATETIME(3) NOT NULL,
    INDEX idx_joueur_carte (joueur_id, carte_id),
    FOREIGN KEY (joueur_id) REFERENCES joueurs(id) ON DELETE CASCADE,
    FOREIGN KEY (carte_id) REFERENCES catalogue(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS epingles (
    joueur_id INT NOT NULL,
    carte_id INT NOT NULL,
    PRIMARY KEY (joueur_id, carte_id),
    FOREIGN KEY (joueur_id) REFERENCES joueurs(id) ON DELETE CASCADE,
    FOREIGN KEY (carte_id) REFERENCES catalogue(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS ouvertures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    joueur_id INT NOT NULL,
    ouverte_le DATETIME(3) NOT NULL,
    source ENUM('stock','achat') NOT NULL,
    cartes JSON NOT NULL,
    FOREIGN KEY (joueur_id) REFERENCES joueurs(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS vues_mensuelles (
    mois CHAR(7) NOT NULL,
    titre VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    vues INT NOT NULL,
    PRIMARY KEY (mois, titre)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

export async function migrer(db) {
  for (const requete of SCHEMA) await db.query(requete);
}
