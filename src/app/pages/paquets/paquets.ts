import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService, messageErreur } from '../../core/api';
import { SessionService } from '../../core/session';
import { Carte, ResultatOuverture } from '../../core/modeles';
import { formatDuree } from '../../core/temps';
import { RouterLink } from '@angular/router';
import { Ouverture } from './ouverture/ouverture';

const PRIX_PAQUET = 100;

@Component({
  selector: 'app-page-paquets',
  imports: [Ouverture, RouterLink],
  styleUrl: './paquets.css',
  template: `
    @if (session.moi(); as moi) {
      <div class="paquets">
        <div class="paquet">PAQUET</div>
        <div class="etat">
          <p class="gris">Paquets disponibles</p>
          <p class="compteur">{{ moi.paquetsStockes }} <small>/ {{ moi.paquetsMax }}</small></p>
          <div class="jauge"><i [style.width.%]="(moi.paquetsStockes / moi.paquetsMax) * 100"></i></div>
          <p class="gris">
            @if (resteMs() === null) { Stock plein } @else { Prochain paquet dans {{ duree(resteMs()!) }} }
          </p>
          <div class="actions">
            <button class="bouton" (click)="ouvrir('stock')" [disabled]="enCours() || moi.paquetsStockes < 1">Ouvrir un paquet</button>
            <button class="lien" (click)="ouvrir('achat')" [disabled]="enCours() || moi.pieces < prix">Acheter · {{ prix }} pièces</button>
          </div>
          @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
          <p class="gris petit">Légendaire garantie dans {{ moi.paquetsAvantPitie }} paquets</p>
        </div>
        <aside class="dernieres">
          <h2>Dernières cartes</h2>
          @for (c of dernieres(); track $index) {
            <a [routerLink]="['/carte', c.id]"><span class="pastille" [class]="c.rarete"></span>{{ c.titre }}</a>
          } @empty {
            <p class="gris petit">Ouvre un paquet pour commencer.</p>
          }
        </aside>
      </div>
    }
    @if (ouverture(); as r) { <app-ouverture [resultat]="r" (fermer)="ouverture.set(null)" /> }
  `,
})
export class PagePaquets implements OnInit, OnDestroy {
  protected session = inject(SessionService);
  private api = inject(ApiService);
  protected prix = PRIX_PAQUET;
  protected enCours = signal(false);
  protected erreur = signal('');
  protected ouverture = signal<ResultatOuverture | null>(null);
  protected dernieres = signal<Carte[]>([]);
  private maintenant = signal(Date.now());
  private minuteur?: ReturnType<typeof setInterval>;
  private rechargeEnCours = false;

  protected resteMs = computed(() => {
    const moi = this.session.moi();
    if (!moi || moi.prochainPaquetDansMs === null) return null;
    return Math.max(0, moi.prochainPaquetDansMs - (this.maintenant() - this.session.recuLe()));
  });
  protected duree = formatDuree;

  ngOnInit() {
    this.minuteur = setInterval(async () => {
      this.maintenant.set(Date.now());
      if (this.resteMs() === 0 && !this.rechargeEnCours) {
        this.rechargeEnCours = true;
        await this.session.charger();
        this.rechargeEnCours = false;
      }
    }, 1000);
  }

  ngOnDestroy() { clearInterval(this.minuteur); }

  async ouvrir(source: 'stock' | 'achat') {
    this.enCours.set(true);
    this.erreur.set('');
    try {
      const resultat = await this.api.ouvrirPaquet(source);
      this.session.definir(resultat.etat);
      this.maintenant.set(Date.now());
      this.dernieres.update((d) => [...resultat.cartes, ...d].slice(0, 10));
      this.ouverture.set(resultat);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.enCours.set(false);
    }
  }
}
