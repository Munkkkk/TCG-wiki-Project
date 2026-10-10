import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../core/session';

@Component({
  selector: 'app-navigation',
  imports: [RouterLink, RouterLinkActive, DecimalPipe],
  styleUrl: './navigation.css',
  template: `
    @if (session.moi(); as moi) {
      <header class="haut">
        <a routerLink="/paquets" class="marque">WikiCards</a>
        <nav class="liens">
          <a routerLink="/paquets" routerLinkActive="actif">Paquets</a>
          <a routerLink="/album" routerLinkActive="actif">Album</a>
          <a routerLink="/doublons" routerLinkActive="actif">Doublons</a>
        </nav>
        <span class="pieces">{{ moi.pieces | number }} pièces</span>
        <a routerLink="/profil" routerLinkActive="actif" class="profil" aria-label="Profil">{{ moi.pseudo }}</a>
      </header>

      <nav class="bas">
        <a routerLink="/paquets" routerLinkActive="actif">
          <svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M4 11h16M12 7v13" /></svg>Paquets
        </a>
        <a routerLink="/album" routerLinkActive="actif">
          <svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" /><rect x="13" y="4" width="7" height="7" /><rect x="4" y="13" width="7" height="7" /><rect x="13" y="13" width="7" height="7" /></svg>Album
        </a>
        <a routerLink="/doublons" routerLinkActive="actif">
          <svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5M18 3v4h-4M6 21v-4h4" /></svg>Doublons
        </a>
        <a routerLink="/profil" routerLinkActive="actif">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>Profil
        </a>
      </nav>
    }
  `,
})
export class Navigation {
  protected session = inject(SessionService);
}
