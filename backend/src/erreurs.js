export class ErreurJeu extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function gestionnaireErreurs(err, req, res, next) {
  if (err instanceof ErreurJeu) {
    return res.status(err.status).json({ code: err.code, message: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'REQUETE_INVALIDE', message: 'Requête invalide.' });
  }
  console.error(err);
  res.status(500).json({ code: 'ERREUR_SERVEUR', message: 'Erreur interne, réessaie plus tard.' });
}
