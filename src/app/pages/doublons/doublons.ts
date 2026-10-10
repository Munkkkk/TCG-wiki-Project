import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService, messageErreur } from '../../core/api';
import { SessionService } from '../../core/session';
import { Doublon, Rarete } from '../../core/modeles';
import { LIBELLES_RARETE } from '../../core/libelles';
import { Selection, basculer, definirQuantite, totalSelection, toutSelectionner } from './selection';

@Component({
  selector: 'app-page-doublons',
  styleUrl: './doublons.css',
  template: `
    <h1>Doublons</h1>
    <p class="gris">Tu gardes toujours un exemplaire de chaque carte. Les cartes épinglées ne sont jamais vendues.</p>

    <div class="outils">
      <button class="bouton secondaire" (click)="majSelection(toutSelectionner(doublons(), null))">Tout sélectionner</button>
      <button class="bouton secondaire" (click)="majSelection(toutSelectionner(doublons(), 'commune'))">Toutes les Communes</button>
      <button class="bouton secondaire" (click)="majSelection(toutSelectionner(doublons(), 'rare'))">Toutes les Rares</button>
      <button class="lien" (click)="majSelection(vide)">Vider</button>
    </div>

    <ul class="liste">
      @for (d of doublons(); track d.carteId) {
        <li>
          <input type="checkbox" [checked]="selection().has(d.carteId)" (change)="majSelection(basculer(selection(), d))"
            [attr.aria-label]="'Sélectionner ' + d.titre" />
          <span class="pastille" [class]="d.rarete"></span>
          <span class="nom"><strong>{{ d.titre }}</strong> <span class="gris">{{ libRarete[d.rarete] }} · {{ d.prixUnitaire }} pièces</span></span>
          <input class="champ quantite" type="number" min="0" [max]="d.vendables" [value]="selection().get(d.carteId) ?? 0"
            (change)="saisir(d, $any($event.target))" />
          <span class="gris">/ {{ d.vendables }}</span>
        </li>
      } @empty {
        <li class="gris">Aucun doublon pour l'instant.</li>
      }
    </ul>

    <div class="barre">
      @if (confirmation()) {
        <span>Vendre {{ total().cartes }} cartes pour {{ total().pieces }} pièces ?</span>
        <button class="bouton" (click)="vendre()" [disabled]="enCours() || total().cartes === 0">Confirmer</button>
        <button class="lien" (click)="confirmation.set(false)">Annuler</button>
      } @else {
        <span>{{ total().cartes }} cartes · <strong>+{{ total().pieces }} pièces</strong></span>
        <button class="bouton" (click)="confirmation.set(true)" [disabled]="total().cartes === 0">Vendre la sélection</button>
      }
    </div>
    @if (message()) { <p class="succes">{{ message() }}</p> }
    @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
  `,
})
export class PageDoublons implements OnInit {
  private api = inject(ApiService);
  private session = inject(SessionService);
  protected libRarete = LIBELLES_RARETE;
  protected vide: Selection = new Map();
  protected toutSelectionner = toutSelectionner;
  protected basculer = basculer;
  protected definirQuantite = definirQuantite;

  protected doublons = signal<Doublon[]>([]);
  protected selection = signal<Selection>(new Map());
  protected total = computed(() => totalSelection(this.doublons(), this.selection()));
  protected confirmation = signal(false);
  protected enCours = signal(false);
  protected message = signal('');
  protected erreur = signal('');

  ngOnInit() { this.charger(); }

  private async charger() {
    try {
      this.doublons.set((await this.api.doublons()).doublons);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  protected majSelection(sel: Selection) {
    this.selection.set(sel);
    if (totalSelection(this.doublons(), sel).cartes === 0) this.confirmation.set(false);
  }

  protected saisir(d: Doublon, input: HTMLInputElement) {
    this.majSelection(definirQuantite(this.selection(), d, +input.value));
    input.value = String(this.selection().get(d.carteId) ?? 0);
  }

  async vendre() {
    if (this.enCours() || this.total().cartes === 0) return;
    this.enCours.set(true);
    this.erreur.set('');
    this.message.set('');
    try {
      const ventes = [...this.selection()].map(([carteId, quantite]) => ({ carteId, quantite }));
      const r = await this.api.vendre(ventes);
      this.session.majPieces(r.pieces);
      this.message.set(`${r.cartesVendues} cartes vendues, +${r.piecesGagnees} pièces.`);
      this.selection.set(new Map());
      this.confirmation.set(false);
      await this.charger();
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.enCours.set(false);
    }
  }
}
