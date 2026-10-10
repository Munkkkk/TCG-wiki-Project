import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../core/session';
import { IconeMenu } from './icone';
import { MENU } from './liens';

@Component({
  selector: 'app-navigation',
  imports: [RouterLink, RouterLinkActive, DecimalPipe, IconeMenu],
  styleUrl: './navigation.css',
  template: `
    @if (session.moi(); as moi) {
      <!-- Ordinateur et tablette : menu latéral -->
      <aside class="lateral">
        <a routerLink="/paquets" class="marque">WikiCards</a>
        <p class="pieces">{{ moi.pieces | number }} pièces</p>
        <nav class="entrees" aria-label="Menu principal">
          @for (e of menu; track e.libelle) {
            @if (e.route) {
              <a class="lien" [routerLink]="e.route" routerLinkActive="actif" [attr.title]="e.libelle">
                <app-icone [nom]="e.icone" /><span class="texte">{{ e.libelle }}</span>
              </a>
            } @else {
              <span class="bientot" aria-disabled="true" [attr.title]="e.libelle + ' — bientôt'">
                <app-icone [nom]="e.icone" /><span class="texte">{{ e.libelle }}</span><small>Bientôt</small>
              </span>
            }
          }
        </nav>
        <a routerLink="/profil" routerLinkActive="actif" class="lien profil" title="Profil">
          <app-icone nom="profil" /><span class="texte">{{ moi.pseudo }}</span>
        </a>
      </aside>

      <!-- Mobile : en-tête compact + barre du bas -->
      <header class="haut-mobile">
        <a routerLink="/paquets" class="marque">WikiCards</a>
        <span class="pieces">{{ moi.pieces | number }} pièces</span>
      </header>
      <nav class="bas" aria-label="Menu principal">
        @for (e of menuMobile; track e.libelle) {
          <a [routerLink]="e.route" routerLinkActive="actif"><app-icone [nom]="e.icone" />{{ e.libelle }}</a>
        }
        <a routerLink="/profil" routerLinkActive="actif"><app-icone nom="profil" />Profil</a>
      </nav>
    }
  `,
})
export class Navigation {
  protected session = inject(SessionService);
  protected menu = MENU;
  protected menuMobile = MENU.filter((e) => e.route);
}
