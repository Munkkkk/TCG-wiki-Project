import { Component, computed, input, output, signal } from '@angular/core';
import { ResultatOuverture } from '../../../core/modeles';
import { LIBELLES_RARETE } from '../../../core/libelles';
import { CarteVisuelle } from '../../../ui/carte/carte';
import { Booster } from '../../../ui/booster/booster';
import { EffetLegendaire } from './effet-legendaire';
import { Deroule, apresDechirure, avancer, debut, passer } from './deroule';

@Component({
  selector: 'app-ouverture',
  imports: [CarteVisuelle, EffetLegendaire, Booster],
  styleUrl: './ouverture.css',
  template: `
    <div class="voile" role="dialog" aria-modal="true" aria-label="Ouverture du paquet">
      @switch (deroule().phase) {
        @case ('paquet') {
          <div class="paquet" (animationend)="$event.target === $event.currentTarget && maj(apresDechirure)"><app-booster /></div>
        }
        @case ('pile') {
          <p class="compteur">{{ deroule().index + 1 }} / {{ deroule().cartes.length }}</p>
          <button class="scene" (click)="maj(avancer)"
            [attr.aria-label]="deroule().revelee ? 'Carte suivante' : 'Retourner la carte'">
            @for (n of pileRestante(); track n) {
              <span class="dos empilee" [style.--rang]="n"></span>
            }
            @if (deroule().revelee && legendaire()) { <app-effet-legendaire /> }
            @for (e of courante(); track e.index) {
              <span class="emplacement" animate.enter="arrivee" animate.leave="sortie"
                [class.retournee]="deroule().revelee"
                [class.teaser]="!deroule().revelee && legendaire()"
                [class.halo]="deroule().revelee && e.carte.rarete !== 'commune' && e.carte.rarete !== 'rare'">
                <span class="dos"></span>
                <span class="face" [style.--halo]="'var(--' + e.carte.rarete.replace('_', '-') + ')'">
                  <app-carte [carte]="e.carte" />
                  @if (e.carte.nouvelle) { <span class="nouvelle">Nouvelle</span> }
                </span>
              </span>
            }
          </button>
          <p class="aide" aria-live="polite">
            @if (deroule().revelee) { {{ courante()[0].carte.titre }} · {{ libelles[courante()[0].carte.rarete] }} }
            @else { Touche la carte pour la retourner }
          </p>
          <button class="lien" (click)="maj(passer)">Passer</button>
        }
        @case ('recap') {
          <div class="recap">
            @for (c of deroule().cartes; track $index) {
              <div class="case" [class.legendaire]="c.rarete === 'legendaire'">
                <app-carte [carte]="c" />
                @if (c.nouvelle) { <span class="nouvelle">Nouvelle</span> }
              </div>
            }
          </div>
          @if (resultat().venteAuto?.cartes) {
            <p class="aide">{{ resultat().venteAuto!.cartes }} Communes en double revendues (+{{ resultat().venteAuto!.pieces }} pièces).</p>
          }
          <button class="bouton" (click)="fermer.emit()">Terminer</button>
        }
      }
    </div>
  `,
})
export class Ouverture {
  resultat = input.required<ResultatOuverture>();
  fermer = output<void>();

  protected libelles = LIBELLES_RARETE;
  protected apresDechirure = apresDechirure;
  protected avancer = avancer;
  protected passer = passer;

  private etat = signal<Deroule | null>(null);
  protected deroule = computed(() => this.etat() ?? debut(this.resultat().cartes));
  protected courante = computed(() => {
    const d = this.deroule();
    return [{ index: d.index, carte: d.cartes[d.index] }];
  });
  protected legendaire = computed(() => this.courante()[0].carte.rarete === 'legendaire');
  /** Dos empilés sous la carte du dessus. */
  protected pileRestante = computed(() => {
    const d = this.deroule();
    return Array.from({ length: d.cartes.length - d.index - 1 }, (_, i) => i + 1);
  });

  maj(etape: (d: Deroule) => Deroule) {
    this.etat.set(etape(this.deroule()));
  }
}
