import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, messageErreur } from '../../core/api';
import { CarteDetail } from '../../core/modeles';
import { LIBELLES_RARETE, LIBELLES_TYPE } from '../../core/libelles';
import { CarteVisuelle } from '../../ui/carte/carte';

@Component({
  selector: 'app-page-carte',
  imports: [CarteVisuelle, RouterLink],
  styleUrl: './carte-detail.css',
  template: `
    <a routerLink="/album" class="lien">← Album</a>
    @if (carte(); as c) {
      <div class="fiche">
        <app-carte [carte]="c" class="grande" />
        <div class="infos">
          <h1>{{ c.titre }}</h1>
          <p class="gris"><span class="pastille" [class]="c.rarete"></span> {{ raretes[c.rarete] }} · {{ types[c.type] }}</p>
          <p>{{ c.extrait }}</p>
          <p class="gris">Exemplaires possédés : {{ c.quantite }}</p>
          @if (!c.actif) { <p class="gris">Cette carte ne sort plus des paquets.</p> }
          <div class="actions">
            @if (c.quantite > 0) {
              <button class="bouton secondaire" (click)="basculerEpingle(c)">{{ c.epinglee ? 'Désépingler' : 'Épingler' }}</button>
            }
            <a class="lien" [href]="'https://fr.wikipedia.org/?curid=' + c.pageId" target="_blank" rel="noopener">Lire l'article sur Wikipédia</a>
          </div>
        </div>
      </div>
    }
    @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
  `,
})
export class PageCarte {
  private api = inject(ApiService);
  id = input.required<string>();
  protected carte = signal<CarteDetail | null>(null);
  protected erreur = signal('');
  protected raretes = LIBELLES_RARETE;
  protected types = LIBELLES_TYPE;

  constructor() {
    effect(() => { this.charger(Number(this.id())); });
  }

  private async charger(id: number) {
    this.erreur.set('');
    try {
      this.carte.set(await this.api.carte(id));
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  async basculerEpingle(c: CarteDetail) {
    try {
      const { epinglee } = await this.api.epingler(c.id, !c.epinglee);
      this.carte.set({ ...c, epinglee });
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }
}
