import { Component, computed, input } from '@angular/core';
import { Carte } from '../../core/modeles';
import { LIBELLES_RARETE, LIBELLES_TYPE } from '../../core/libelles';

const HOLO = new Set(['ultra_rare', 'super_rare', 'legendaire']);

/** Carte « plein cadre » : l'image remplit la carte, le texte est posé sur un dégradé. */
@Component({
  selector: 'app-carte',
  styleUrl: './carte.css',
  template: `
    <article class="carte" [class]="'rarete-' + carte().rarete" [class.holo]="holo()" [class.mini]="taille() === 'mini'">
      <div class="illustration">
        @if (carte().imageUrl) {
          <img [src]="carte().imageUrl" [alt]="carte().titre" loading="lazy" />
        } @else {
          <div class="sans-image">{{ carte().titre.charAt(0) }}</div>
        }
      </div>
      <header class="entete">
        <span class="rarete">{{ libelleRarete() }}</span>
        <span class="type">{{ libelleType() }}</span>
      </header>
      <footer class="bas">
        <h3 class="titre">{{ carte().titre }}</h3>
        @if (taille() === 'normale') {
          <p class="texte">{{ carte().extrait }}</p>
        }
        <div class="stats">
          <span><b>{{ carte().attaque }}</b>ATQ</span>
          <span><b>{{ carte().defense }}</b>DÉF</span>
        </div>
      </footer>
    </article>
  `,
})
export class CarteVisuelle {
  carte = input.required<Carte>();
  taille = input<'normale' | 'mini'>('normale');
  protected holo = computed(() => HOLO.has(this.carte().rarete));
  protected libelleRarete = computed(() => LIBELLES_RARETE[this.carte().rarete]);
  protected libelleType = computed(() => LIBELLES_TYPE[this.carte().type]);
}
