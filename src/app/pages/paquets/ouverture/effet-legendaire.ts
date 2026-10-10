import { Component } from '@angular/core';

/** Flash doré, rayons tournants et particules autour d'une carte Légendaire révélée. */
@Component({
  selector: 'app-effet-legendaire',
  styleUrl: './effet-legendaire.css',
  host: { 'aria-hidden': 'true' },
  template: `
    <div class="flash"></div>
    <div class="rayons"></div>
    @for (p of particules; track p) {
      <span class="particule" [style.--angle]="p * 30 + 'deg'" [style.--delai]="(p % 3) * 0.12 + 's'"></span>
    }
    <p class="titre">LÉGENDAIRE</p>
  `,
})
export class EffetLegendaire {
  protected particules = Array.from({ length: 12 }, (_, i) => i);
}
