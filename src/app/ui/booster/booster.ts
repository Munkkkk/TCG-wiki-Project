import { Component } from '@angular/core';

/** Le booster WikiCards « noir & or » : sachet foil aux bords dentelés. La largeur vient de l'hôte. */
@Component({
  selector: 'app-booster',
  styleUrl: './booster.css',
  host: { 'aria-hidden': 'true' },
  template: `
    <div class="sachet">
      <div class="motif"></div>
      <div class="bande haut"></div>
      <div class="bande bas"></div>
      <div class="centre">
        <div class="medaille">W</div>
        <div class="nom">WikiCards</div>
        <div class="points">
          <i class="commune"></i><i class="rare"></i><i class="ultra_rare"></i><i class="super_rare"></i><i class="legendaire"></i>
        </div>
        <div class="sous">5 cartes</div>
      </div>
      <div class="reflet"></div>
    </div>
  `,
})
export class Booster {}
