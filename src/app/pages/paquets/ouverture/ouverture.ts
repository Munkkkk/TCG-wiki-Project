import { Component, computed, input, output, signal } from '@angular/core';
import { ResultatOuverture } from '../../../core/modeles';
import { CarteVisuelle } from '../../../ui/carte/carte';

@Component({
  selector: 'app-ouverture',
  imports: [CarteVisuelle],
  styleUrl: './ouverture.css',
  template: `
    <div class="voile" role="dialog" aria-label="Ouverture du paquet">
      @if (!dechire()) {
        <div class="paquet" (animationend)="dechire.set(true)">PAQUET</div>
      } @else {
        <div class="cartes">
          @for (c of resultat().cartes; track $index) {
            <button class="emplacement" [class.retournee]="retournees().has($index)" (click)="retourner($index)"
              [attr.aria-label]="retournees().has($index) ? c.titre : 'Retourner la carte'">
              <span class="dos"></span>
              <span class="face">
                <app-carte [carte]="c" />
                @if (c.nouvelle) { <span class="nouvelle">Nouvelle</span> }
              </span>
            </button>
          }
        </div>
        @if (resultat().venteAuto?.cartes) {
          <p class="gris">{{ resultat().venteAuto!.cartes }} Communes en double revendues (+{{ resultat().venteAuto!.pieces }} pièces).</p>
        }
        <div class="actions">
          @if (!toutesRetournees()) {
            <button class="bouton secondaire" (click)="toutRetourner()">Tout retourner</button>
          }
          <button class="bouton" (click)="fermer.emit()">Terminer</button>
        </div>
      }
    </div>
  `,
})
export class Ouverture {
  resultat = input.required<ResultatOuverture>();
  fermer = output<void>();
  protected dechire = signal(false);
  protected retournees = signal<ReadonlySet<number>>(new Set());
  protected toutesRetournees = computed(() => this.retournees().size === this.resultat().cartes.length);

  retourner(i: number) {
    this.retournees.update((s) => new Set(s).add(i));
  }

  toutRetourner() {
    this.retournees.set(new Set(this.resultat().cartes.map((_, i) => i)));
  }
}
