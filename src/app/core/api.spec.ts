import { HttpErrorResponse } from '@angular/common/http';
import { messageErreur } from './api';

describe('messageErreur', () => {
  const CONNEXION = 'Connexion perdue, réessaie.';

  it('signale la connexion perdue pour le statut 0', () => {
    expect(messageErreur(new HttpErrorResponse({ status: 0 }))).toBe(CONNEXION);
  });

  it.each([502, 503, 504, 500])('signale la connexion perdue pour un %i sans corps', (status) => {
    expect(messageErreur(new HttpErrorResponse({ status, error: '' }))).toBe(CONNEXION);
  });

  it('garde le message du serveur quand il existe', () => {
    const e = new HttpErrorResponse({ status: 409, error: { code: 'STOCK_VIDE', message: 'Plus de paquet disponible pour le moment.' } });
    expect(messageErreur(e)).toBe('Plus de paquet disponible pour le moment.');
  });

  it('garde le message du serveur pour un 500 JSON', () => {
    const e = new HttpErrorResponse({ status: 500, error: { code: 'ERREUR', message: 'Erreur serveur.' } });
    expect(messageErreur(e)).toBe('Erreur serveur.');
  });

  it('renvoie un message générique pour une erreur inconnue', () => {
    expect(messageErreur(new Error('x'))).toBe('Une erreur est survenue, réessaie.');
  });
});
