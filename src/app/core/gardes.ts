import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session';

/**
 * Joueur connu (déjà chargé, ou chargé avec succès). Un échec non-401 (réseau, 5xx)
 * ne déconnecte pas : si `moi` est déjà là on le garde ; sinon aucune session n'est
 * connue et on traite le cas comme « non connecté » (redirection vers /connexion).
 */
async function estConnecte(session: SessionService): Promise<boolean> {
  if (session.moi()) return true;
  try {
    return (await session.charger()) !== null;
  } catch {
    return session.moi() !== null;
  }
}

export const connecteGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (await estConnecte(session)) return true;
  return router.parseUrl('/connexion');
};

export const inviteGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (await estConnecte(session)) return router.parseUrl('/paquets');
  return true;
};
