import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { CardDetail } from './pages/card-detail/card-detail';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'card/:name', component: CardDetail }
];
