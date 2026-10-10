import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ApiService, messageErreur } from '../../core/api';
import { SessionService } from '../../core/session';
import { Carte, Collection, ResultatOuverture } from '../../core/modeles';
import { LIBELLES_RARETE, RARETES } from '../../core/libelles';
import { formatDuree } from '../../core/temps';
import { Router, RouterLink } from '@angular/router';
import { Ouverture } from './ouverture/ouverture';
import { CarteVisuelle } from '../../ui/carte/carte';
import { Booster } from '../../ui/booster/booster';

const PRIX_PAQUET = 100;

@Component({
  selector: 'app-page-paquets',
  imports: [Ouverture, RouterLink, CarteVisuelle, Booster, DecimalPipe],
  styleUrl: './paquets.css',
  template: `
    @if (session.moi(); as moi) {
      <div class="paquets">
        @if (collection(); as c) {
          <aside class="panneau collection">
            <h2>Ta collection</h2>
            <p class="total">{{ c.possedees | number }} <small>/ {{ c.tailleCatalogue | number }}</small></p>
            <div class="barre"><i [style.width.%]="c.tailleCatalogue ? (c.possedees / c.tailleCatalogue) * 100 : 0"></i></div>
            <ul>
              @for (r of raretes; track r) {
                <li><span class="pastille" [class]="r"></span>{{ libelles[r] }}<em>{{ c.parRarete[r] | number }}</em></li>
              }
            </ul>
          </aside>
        }

        <div class="centre">
          <button class="paquet" (click)="ouvrir('stock')" [disabled]="enCours() || moi.paquetsStockes < 1"
            aria-label="Ouvrir un paquet">
            <app-booster />
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
          </div>
        </div>

        @if (collection(); as c) {
          <aside class="panneau taux">
            <h2>Taux par carte</h2>
            <ul>
              @for (r of raretes; track r) {
                <li><span class="pastille" [class]="r"></span>{{ libelles[r] }}<em>{{ c.taux[r] }} %</em></li>
              }
            </ul>
            <h2>Légendaire garantie</h2>
            <div class="barre pitie"><i [style.width.%]="((c.pitie - moi.paquetsAvantPitie) / c.pitie) * 100"></i></div>
            <p class="gris petit">dans {{ moi.paquetsAvantPitie }} {{ moi.paquetsAvantPitie === 1 ? 'paquet' : 'paquets' }}</p>
          </aside>
        }

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
  protected collection = signal<Collection | null>(null);
  protected raretes = RARETES;
  protected libelles = LIBELLES_RARETE;
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
    this.chargerCollection();
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

  /** Les panneaux sont un bonus : en cas d'échec, la page reste utilisable sans eux. */
  private async chargerCollection() {
    try {
      this.collection.set(await this.api.collection());
    } catch {
      // panneaux masqués
    }
  }

  async ouvrir(source: 'stock' | 'achat') {
    this.enCours.set(true);
    this.erreur.set('');
    try {
      const resultat = await this.api.ouvrirPaquet(source);
      this.session.definir(resultat.etat);
      this.maintenant.set(Date.now());
      this.dernieres.update((d) => [...resultat.cartes, ...d].slice(0, 10));
      this.ouverture.set(resultat);
      this.chargerCollection();
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.enCours.set(false);
    }
  }
}
