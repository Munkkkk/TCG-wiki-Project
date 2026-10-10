import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from './session';

/** Session expirée sur une page protégée → retour à la connexion. */
export const intercepteurSession: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((e) => {
      const ignore = req.url.startsWith('/api/auth') || req.url === '/api/moi';
      if (e instanceof HttpErrorResponse && e.status === 401 && !ignore) {
        session.vider();
        router.navigateByUrl('/connexion');
      }
      return throwError(() => e);
    }),
  );
};
