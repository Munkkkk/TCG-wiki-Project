import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session';

export const connecteGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.moi() || (await session.charger())) return true;
  return router.parseUrl('/connexion');
};

export const inviteGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.moi() || (await session.charger())) return router.parseUrl('/paquets');
  return true;
};
