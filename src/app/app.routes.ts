import { Routes } from '@angular/router';
import { PageAuth } from './pages/auth/auth';

export const routes: Routes = [
  { path: 'connexion', component: PageAuth, data: { mode: 'connexion' } },
  { path: 'inscription', component: PageAuth, data: { mode: 'inscription' } },
  { path: '**', redirectTo: 'connexion' },
];
