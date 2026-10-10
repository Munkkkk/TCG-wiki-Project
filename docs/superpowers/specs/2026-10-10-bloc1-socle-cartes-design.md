# Bloc 1 — Socle + cartes : design

Date : 2026-10-10
Statut : en relecture

## 1. Contexte et objectif

On construit un concurrent public de [wiki-masters.com](https://www.wiki-masters.com/) : un jeu de cartes à collectionner dont chaque carte est un article de Wikipédia FR. Nom provisoire : **WikiCards**.

Le projet est découpé en 5 blocs. Chacun a sa propre spec, son plan et son implémentation :

1. **Socle + cartes** (ce document) : comptes, catalogue, paquets, album, doublons
2. Économie : échanges, marché, enchères
3. Duels, y compris les forces et faiblesses entre types
4. Social : amis, guildes, classements, succès
5. Finitions mobile/PWA. Le bloc 1 est déjà conçu pour le mobile.

Le nouveau site doit faire mieux que l'original sur 4 points : design des cartes, profondeur des duels, économie, mobile et rapidité.

**Critère de réussite du bloc 1** : un joueur crée un compte, ouvre des paquets qui se rechargent, voit ses cartes dans son album, et revend ses doublons en quelques clics. Tout cela fonctionne sur ordinateur et sur mobile.

## 2. Stack

On repart du projet existant `C:\Users\Ludwig\wiki-masters` :

- **Front** : Angular 22 avec SSR (déjà en place). Les données factices (Pokémon dans `services/card.ts`) sont remplacées.
- **Back** : Express 5 + MySQL (`backend/`, déjà en place, avec `mysql2`).
- **Tests** : Vitest (déjà installé côté front, à ajouter côté backend).
- **Comptes** : email + mot de passe (bcrypt), session par JWT dans un cookie `httpOnly`, `secure` et `sameSite=lax`. Les connexions Google et Discord sont reportées à plus tard.

**Règle d'or** : toute logique qui touche aux cartes, aux paquets ou à la monnaie s'exécute dans Express, à l'intérieur d'une transaction MySQL. Le front affiche les données et envoie des intentions, comme « ouvrir un paquet ». Il ne calcule jamais un résultat.

## 3. Catalogue de cartes

### 3.1 Génération (job hebdomadaire)

Un script Node `backend/src/jobs/build-catalogue.js` s'exécute une fois par semaine et en manuel au premier lancement.

1. **Popularité** : fichiers mensuels de vues Wikimedia (`dumps.wikimedia.org/other/pageview_complete/monthly`), filtrés sur `fr.wikipedia` et l'espace des articles. On fait la somme sur les 12 derniers mois.
2. **Filtre 1, pages qui ne sont pas des articles** : on exclut les redirections, les homonymies (pageprop `disambiguation`), les titres commençant par « Liste de » / « Liste des », les pages de dates et d'années (ex. « 1789 », « 14 juillet ») et les articles de moins de 2 000 octets.
3. **Filtre 2, top N** : on garde les **N** articles les plus vus. N vient de la config, avec 50 000 par défaut.
4. **Métadonnées**, via l'API MediaWiki par lots de 50 titres : titre, `page_id`, extrait, image (miniature), longueur en octets, catégories de label (« Article de qualité », « Bon article »), nombre de liens externes, élément Wikidata.
5. **Type**, depuis la propriété Wikidata *nature de l'élément* (P31), avec une table de correspondance (ex. humain Q5 → Personnalité, ville / pays / montagne → Lieu, taxon → Nature). Si rien ne correspond, on se rabat sur les catégories de l'article, puis sur **Culture** par défaut.
   *Écart avec la discussion : on avait parlé des catégories. Wikidata P31 est plus fiable, et les catégories restent la solution de secours.*
6. Les résultats sont écrits dans la table `catalogue` en *upsert* sur `page_id`. Les cartes sorties du top N passent à `actif = 0`. Elles ne sortent plus des paquets, mais leurs propriétaires les gardent.
7. Si une étape échoue, par exemple parce que Wikipédia est injoignable, la transaction est annulée et l'ancien catalogue reste en place.

Le script respecte la politique de Wikimedia : un User-Agent avec un contact, et des requêtes séquentielles avec `maxlag`.

### 3.2 Stats (échelle 1 à 100)

| Stat | Calcul |
|---|---|
| **Rareté** | rang dans le top N. Top 1 % = Légendaire, 4 % suivants = Super Rare, 10 % suivants = Ultra Rare, 25 % suivants = Rare, 60 % restants = Commune |
| **Attaque** | `1 + round(99 × percentile(longueur))` dans le catalogue |
| **Défense** | `1 + round(99 × (0.6 × percentile(liens externes) + 0.4 × label))`, avec label = 1 pour un Article de qualité, 0.6 pour un Bon article, 0 sinon |
| **Type** | Personnalité, Lieu, Histoire, Science, Culture ou Nature |

Les stats sont recalculées chaque semaine. Une carte possédée affiche toujours les stats **actuelles** du catalogue.

## 4. Modèle de données (MySQL)

```
joueurs
  id PK, email UNIQUE, mot_de_passe_hash, pseudo UNIQUE,
  pieces INT DEFAULT 0,
  paquets_stockes INT DEFAULT 10,
  dernier_calcul DATETIME,
  paquets_sans_legendaire INT DEFAULT 0,
  vente_auto_communes BOOL DEFAULT 0,
  cree_le DATETIME

catalogue
  id PK, page_id UNIQUE, titre, extrait TEXT, image_url,
  type ENUM(...), rarete ENUM(...), attaque, defense,
  rang INT, vues_12_mois BIGINT, actif BOOL, maj_le DATETIME
  INDEX (actif, rarete)

cartes_joueur            -- une ligne par exemplaire
  id PK, joueur_id FK, carte_id FK catalogue, obtenue_le DATETIME
  INDEX (joueur_id, carte_id)

epingles                 -- épinglage par carte, pas par exemplaire
  joueur_id FK, carte_id FK, PK (joueur_id, carte_id)

ouvertures
  id PK, joueur_id FK, ouverte_le DATETIME,
  source ENUM('stock','achat'), cartes JSON
```

On stocke une ligne par exemplaire, et non un compteur, parce que les échanges du bloc 2 déplaceront un exemplaire précis.

## 5. Règles de jeu

Toutes les valeurs sont dans `backend/src/config/jeu.js`.

| Règle | Valeur |
|---|---|
| Recharge | +1 paquet toutes les 60 min |
| Stock maximum | 10 paquets |
| Compte neuf | 10 paquets, 0 pièce |
| Cartes par paquet | 5 |
| Taux par carte | Commune 60 %, Rare 25 %, Ultra Rare 10 %, Super Rare 4 %, Légendaire 1 % |
| Garantie | la 5e carte est tirée parmi Rare et mieux (taux renormalisés) |
| Pitié | au 50e paquet consécutif sans Légendaire, la 5e carte est une Légendaire |
| Prix de revente | Commune 5, Rare 15, Ultra Rare 40, Super Rare 100, Légendaire 300 pièces |
| Paquet acheté | 100 pièces. Il s'ouvre aussitôt, sans toucher au stock. |

### 5.1 Recharge (calculée à la demande, sans minuteur)

```
gagnés = floor((maintenant - dernier_calcul) / 60 min)
si paquets_stockes + gagnés >= 10 :
    paquets_stockes = 10 ; dernier_calcul = maintenant
sinon :
    paquets_stockes += gagnés ; dernier_calcul += gagnés × 60 min
```

Ce calcul est refait au début de chaque requête qui lit ou consomme le stock. Le temps avant le prochain paquet vaut `dernier_calcul + 60 min - maintenant`, ou rien si le stock est plein.

**Cas limite** : quand le stock passe de 10 à 9, `dernier_calcul` vaut déjà « maintenant » (mis à jour quand le stock était plein). Le compte à rebours démarre donc à l'ouverture.

### 5.2 Ouverture : `POST /api/paquets/ouvrir` (body `{ source: 'stock' | 'achat' }`)

Tout se passe dans une seule transaction, avec `SELECT … FOR UPDATE` sur la ligne du joueur :

1. Recalcul de la recharge
2. Vérification : stock ≥ 1 ou pièces ≥ 100. Sinon, erreur 409 avec un code (`STOCK_VIDE` / `PIECES_INSUFFISANTES`).
3. Débit
4. Tirage des 5 raretés (garantie et pitié), puis pour chaque rareté une carte `actif = 1` choisie au hasard de façon uniforme (`crypto.randomInt`)
5. Insertion dans `cartes_joueur`, mise à jour du compteur de pitié, insertion dans `ouvertures`
6. Si `vente_auto_communes` est activé : les Communes déjà possédées et non épinglées sont vendues immédiatement et l'opération est signalée dans la réponse
7. Commit, puis réponse : les 5 cartes, le nouvel état (stock, pièces, prochain paquet)

Le verrou `FOR UPDATE` empêche le double débit en cas de double clic.

### 5.3 Vente de doublons : `POST /api/doublons/vendre` (body `[{ carte_id, quantite }]`)

- **Doublon** = tout exemplaire au-delà du premier d'une carte **non épinglée**. Une carte épinglée n'a aucun doublon vendable.
- Le serveur recalcule pour chaque carte : `vendables = épinglée ? 0 : possédés − 1`. Il plafonne la quantité demandée à cette valeur.
- Il supprime les exemplaires les plus récents d'abord, crédite les pièces au prix serveur, et répond avec le nombre de cartes vendues et les pièces gagnées
- Le total affiché par le front n'est qu'une estimation, le serveur ne s'y fie jamais

## 6. API (bloc 1)

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/auth/inscription` | email, pseudo, mot de passe (8 caractères minimum) |
| POST | `/api/auth/connexion` | limité à 5 essais / 15 min par IP |
| POST | `/api/auth/deconnexion` | |
| GET | `/api/moi` | profil + état des paquets (avec recalcul de la recharge) |
| PATCH | `/api/moi` | pseudo, `vente_auto_communes` |
| POST | `/api/paquets/ouvrir` | voir 5.2 |
| GET | `/api/album` | cartes possédées regroupées (quantité, épinglée). Filtres : rareté, type, recherche, manquantes. Pagination. |
| PATCH | `/api/album/:carteId/epingle` | épingler ou désépingler |
| GET | `/api/doublons` | liste des doublons vendables + prix |
| POST | `/api/doublons/vendre` | voir 5.3 |
| GET | `/api/cartes/:id` | fiche d'une carte du catalogue |

Les erreurs sont renvoyées au format `{ code, message }`, avec un message en français.

## 7. Front (Angular)

### 7.1 Pages

| Route | Contenu |
|---|---|
| `/connexion`, `/inscription` | formulaires simples |
| `/paquets` (accueil une fois connecté) | paquet, compteur « 4 / 10 », jauge, compte à rebours, bouton Ouvrir, lien Acheter, compteur de pitié, colonne « Dernières cartes » |
| `/album` | sur ordinateur, filtres dans une colonne à gauche (rareté, type, manquantes). Recherche, grille, pastille de rareté, quantité, mention « épinglée » |
| `/doublons` | liste groupée, cases à cocher et quantité, « Tout sélectionner », filtre par rareté, total en direct, confirmation |
| `/carte/:id` | grande carte, extrait, lien vers l'article Wikipédia, épingler |
| `/profil` | pseudo, statistiques simples, option de vente automatique, déconnexion |

Navigation : **menu en haut sur ordinateur, barre en bas sur mobile** (moins de 768 px). Les pièces sont visibles en permanence.

### 7.2 Direction visuelle

- **Interface épurée, thème sombre uniquement** : fond `#111113`, texte `#ededed`, gris secondaire `#8b8b90`, bordures `#26262b`. Pas d'emojis ni de halos dans l'interface, des icônes au trait, beaucoup d'espace.
- **Couleur réservée à la rareté** : Commune `#a8a29e`, Rare `#3b82f6`, Ultra Rare `#a855f7`, Super Rare `#ec4899`, Légendaire `#d97706`
- **Cartes en style « TCG classique »** : cadre coloré selon la rareté, image de l'article, nom, type et extrait, attaque et défense en bas, reflet holo animé sur Ultra Rare et au-dessus
- Couleurs et espacements en variables CSS dans `styles.css`, pour enrichir le design au fil du projet
- Maquettes de référence : `.superpowers/brainstorm/*/content/card-style.html` (option A) et `pages-desktop.html` (variante sombre)

### 7.3 Ouverture d'un paquet

1. Le paquet se déchire (animation CSS de 0,5 s)
2. 5 cartes face cachée
3. Un clic retourne une carte. Reflet holo au retournement pour Ultra Rare et au-dessus.
4. Bouton « Tout retourner »

L'animation se joue **après** la réponse du serveur. Le résultat est déjà enregistré : fermer la page ne fait perdre aucune carte.

### 7.4 Mentions légales

Pied de page : contenus issus de Wikipédia sous licence CC BY-SA 4.0. Chaque fiche de carte renvoie vers son article source.

## 8. Gestion des erreurs

| Situation | Comportement |
|---|---|
| Stock vide / pièces insuffisantes | bouton désactivé + message (« Prochain paquet dans 36 min ») ; le serveur renvoie aussi 409 |
| Serveur injoignable | message « Connexion perdue, réessaie ». La transaction garantit qu'on ne perd rien. |
| Double clic | verrou `FOR UPDATE`, la seconde requête attend puis voit l'état à jour |
| Session expirée | redirection vers `/connexion` |
| Catalogue vide (premier lancement) | ouverture refusée, code `CATALOGUE_VIDE` |
| Job catalogue en échec | rollback, ancien catalogue conservé, erreur dans les logs |

## 9. Tests

- **Backend (priorité)**, Vitest + base MySQL de test (Docker) :
  - recharge : 0 min, 59 min, 60 min, 10 h, stock plein, passage de 10 à 9
  - tirage : garantie Rare sur la 5e carte, pitié au 50e paquet, distribution approximative des taux sur 10 000 tirages avec un générateur aléatoire injectable
  - ouverture : débit stock et achat, refus 409, deux requêtes concurrentes qui ne débitent pas deux fois
  - doublons : jamais le dernier exemplaire, jamais une carte épinglée, quantité plafonnée, prix calculé par le serveur
  - auth : inscription, connexion, limite d'essais, routes protégées
- **Job catalogue** : filtres, top N, seuils de rareté, formules de stats et correspondance P31 → type, testés sur des réponses Wikipédia enregistrées (sans réseau)
- **Front** : composant carte (rendu par rareté), page Doublons (sélection et total), compte à rebours

## 10. Hors périmètre du bloc 1

Échanges, marché, enchères, duels, amis, guildes, classements, succès, connexion Google et Discord, PWA hors-ligne, thème clair, déploiement en production. Le choix de l'hébergeur (Railway ou Render) se fera à la fin du bloc 1, dans un plan séparé.
