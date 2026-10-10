import { Routes } from '@angular/router';
import { connecteGuard, inviteGuard } from './core/gardes';
import { PageAuth } from './pages/auth/auth';
import { PagePaquets } from './pages/paquets/paquets';
import { PageAlbumComposant } from './pages/album/album';
import { PageCarte } from './pages/carte/carte-detail';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'paquets' },
  { path: 'connexion', component: PageAuth, data: { mode: 'connexion' }, canActivate: [inviteGuard] },
  { path: 'inscription', component: PageAuth, data: { mode: 'inscription' }, canActivate: [inviteGuard] },
  {
    path: '',
    canActivate: [connecteGuard],
    children: [
      { path: 'paquets', component: PagePaquets },
      { path: 'carte/:id', component: PageCarte },
      // PAGES (ajoutées par les tâches suivantes)
      { path: 'album', component: PageAlbumComposant },
    ],
  },
  { path: '**', redirectTo: 'paquets' },
];
