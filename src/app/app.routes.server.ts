import { RenderMode, ServerRoute } from '@angular/ssr';

// Pages derrière une session : rendu côté navigateur uniquement.
export const serverRoutes: ServerRoute[] = [
  { path: '**', renderMode: RenderMode.Client },
];
