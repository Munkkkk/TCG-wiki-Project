import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService, messageErreur } from '../../core/api';
import { SessionService } from '../../core/session';
import { Carte, ResultatOuverture } from '../../core/modeles';
import { formatDuree } from '../../core/temps';
import { Router, RouterLink } from '@angular/router';
import { Ouverture } from './ouverture/ouverture';
import { CarteVisuelle } from '../../ui/carte/carte';

const PRIX_PAQUET = 100;

@Component({
  selector: 'app-page-paquets',
  imports: [Ouverture, RouterLink, CarteVisuelle],
  styleUrl: './paquets.css',
  template: `
    @if (session.moi(); as moi) {
      <div class="paquets">
        <button class="paquet" (click)="ouvrir('stock')" [disabled]="enCours() || moi.paquetsStockes < 1"
          aria-label="Ouvrir un paquet">
          <span class="paquet-nom">WikiCards</span>
          <span class="paquet-sous">5 cartes</span>
        </button>

        <div class="etat">
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
          <p class="gris petit">Légendaire garantie dans {{ moi.paquetsAvantPitie }} {{ moi.paquetsAvantPitie === 1 ? 'paquet' : 'paquets' }}</p>
        </div>

        <section class="dernieres">
          <h2>Dernières cartes</h2>
          <div class="rangee">
            @for (c of dernieres(); track $index) {
              <a class="mini" [routerLink]="['/carte', c.id]" [attr.title]="c.titre"><app-carte [carte]="c" taille="mini" /></a>
            } @empty {
              <p class="gris petit">Ouvre un paquet pour commencer.</p>
            }
          </div>
        </section>
      </div>
    }
    @if (ouverture(); as r) { <app-ouverture [resultat]="r" (fermer)="ouverture.set(null)" /> }
  `,
})
export class PagePaquets implements OnInit, OnDestroy {
  protected session = inject(SessionService);
  private api = inject(ApiService);
  private router = inject(Router);
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
        try {
          if ((await this.session.charger()) === null) this.router.navigateByUrl('/connexion');
        } catch (e) {
          this.erreur.set(messageErreur(e));
        } finally {
          this.rechargeEnCours = false;
        }
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
