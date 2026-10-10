import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, messageErreur } from '../../core/api';
import { CarteAlbum, FiltresAlbum, Rarete, TypeCarte } from '../../core/modeles';
import { LIBELLES_RARETE, LIBELLES_TYPE, RARETES, TYPES } from '../../core/libelles';
import { CarteVisuelle } from '../../ui/carte/carte';

@Component({
  selector: 'app-page-album',
  imports: [CarteVisuelle, RouterLink, DecimalPipe],
  styleUrl: './album.css',
  template: `
    <div class="album">
      <aside class="filtres">
        <h3>Rareté</h3>
        @for (r of raretes; track r) {
          <label><input type="checkbox" [checked]="filtres().raretes.includes(r)" (change)="basculerRarete(r)" />
            <span class="pastille" [class]="r"></span>{{ libRarete[r] }}</label>
        }
        <h3>Type</h3>
        @for (t of types; track t) {
          <label><input type="checkbox" [checked]="filtres().types.includes(t)" (change)="basculerType(t)" />{{ libType[t] }}</label>
        }
        <h3>Affichage</h3>
        <label><input type="checkbox" [checked]="filtres().manquantes" (change)="basculerManquantes()" />Cartes manquantes</label>
      </aside>

      <section class="contenu">
        <div class="tete">
          <p><strong>{{ possedees() | number }}</strong> <span class="gris">/ {{ tailleCatalogue() | number }} cartes</span></p>
          <input class="champ recherche" type="search" placeholder="Rechercher une carte…" (input)="rechercher($any($event.target).value)" />
        </div>
        <div class="grille">
          @for (c of cartes(); track c.id) {
            <a [routerLink]="['/carte', c.id]" class="case" [class.manquante]="c.quantite === 0">
              <app-carte [carte]="c" taille="mini" />
              <span class="legende">
                @if (c.epinglee) { <span>Épinglée</span> }
                @if (c.quantite > 1) { <span>×{{ c.quantite }}</span> }
              </span>
            </a>
          } @empty {
            <p class="gris">Aucune carte ici pour l'instant.</p>
          }
        </div>
        @if (cartes().length < total()) {
          <button class="bouton secondaire plus" (click)="pageSuivante()" [disabled]="enCours()">Voir plus</button>
        }
        @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
      </section>
    </div>
  `,
})
export class PageAlbumComposant implements OnInit, OnDestroy {
  private api = inject(ApiService);
  protected raretes = RARETES;
  protected types = TYPES;
  protected libRarete = LIBELLES_RARETE;
  protected libType = LIBELLES_TYPE;

  protected filtres = signal<FiltresAlbum>({ raretes: [], types: [], q: '', manquantes: false, page: 1 });
  protected cartes = signal<CarteAlbum[]>([]);
  protected total = signal(0);
  protected possedees = signal(0);
  protected tailleCatalogue = signal(0);
  protected enCours = signal(false);
  protected erreur = signal('');
  private delaiRecherche?: ReturnType<typeof setTimeout>;

  private requete = 0;

  ngOnInit() { this.charger(); }
  ngOnDestroy() { clearTimeout(this.delaiRecherche); }

  private async charger(ajouter = false, pagePrecedente = 1) {
    const id = ++this.requete;
    const filtres = this.filtres();
    this.enCours.set(true);
    this.erreur.set('');
    try {
      const page = await this.api.album(filtres);
      if (id !== this.requete) return;
      this.cartes.update((c) => (ajouter ? [...c, ...page.cartes] : page.cartes));
      this.total.set(page.total);
      this.possedees.set(page.possedees);
      this.tailleCatalogue.set(page.tailleCatalogue);
    } catch (e) {
      if (id !== this.requete) return;
      if (ajouter) this.filtres.update((f) => ({ ...f, page: pagePrecedente }));
      this.erreur.set(messageErreur(e));
    } finally {
      if (id === this.requete) this.enCours.set(false);
    }
  }

  private changer(modif: Partial<FiltresAlbum>) {
    this.filtres.update((f) => ({ ...f, ...modif, page: 1 }));
    this.charger();
  }

  private bascule<T>(liste: T[], v: T): T[] {
    return liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v];
  }

  basculerRarete(r: Rarete) { this.changer({ raretes: this.bascule(this.filtres().raretes, r) }); }
  basculerType(t: TypeCarte) { this.changer({ types: this.bascule(this.filtres().types, t) }); }
  basculerManquantes() { this.changer({ manquantes: !this.filtres().manquantes }); }

  rechercher(q: string) {
    clearTimeout(this.delaiRecherche);
    this.delaiRecherche = setTimeout(() => this.changer({ q }), 300);
  }

  pageSuivante() {
    this.filtres.update((f) => ({ ...f, page: f.page + 1 }));
    this.charger(true, this.filtres().page - 1);
  }
}
