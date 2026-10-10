import { Component, computed, input } from '@angular/core';
import { Carte } from '../../core/modeles';
import { LIBELLES_RARETE, LIBELLES_TYPE } from '../../core/libelles';

const HOLO = new Set(['ultra_rare', 'super_rare', 'legendaire']);

@Component({
  selector: 'app-carte',
  styleUrl: './carte.css',
  template: `
    <article class="carte" [class]="'rarete-' + carte().rarete" [class.holo]="holo()" [class.mini]="taille() === 'mini'">
      <header class="entete">
        <span class="titre">{{ carte().titre }}</span>
        <span class="gemme" [attr.title]="libelleRarete()"></span>
      </header>
      <div class="illustration">
        @if (carte().imageUrl) {
          <img [src]="carte().imageUrl" [alt]="carte().titre" loading="lazy" />
        } @else {
          <div class="sans-image">{{ carte().titre.charAt(0) }}</div>
        }
      </div>
      @if (taille() === 'normale') {
        <p class="texte"><strong>{{ libelleType() }}</strong> · {{ carte().extrait }}</p>
      }
      <footer class="stats">
        <span>ATQ {{ carte().attaque }}</span>
        <span>DÉF {{ carte().defense }}</span>
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
