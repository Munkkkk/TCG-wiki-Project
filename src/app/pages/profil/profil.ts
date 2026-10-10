import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, messageErreur } from '../../core/api';
import { SessionService } from '../../core/session';

@Component({
  selector: 'app-page-profil',
  imports: [FormsModule, DecimalPipe],
  styles: `
    section { max-width: 480px; display: flex; flex-direction: column; gap: 18px; }
    .stats { display: flex; gap: 32px; }
    .stats strong { display: block; font-size: 28px; font-weight: 600; }
    form { display: flex; gap: 10px; }
    label.option { display: flex; gap: 10px; align-items: center; cursor: pointer; }
  `,
  template: `
    @if (session.moi(); as moi) {
      <section>
        <h1>{{ moi.pseudo }}</h1>
        <div class="stats">
          <div><strong>{{ possedees() | number }}</strong><span class="gris">cartes différentes</span></div>
          <div><strong>{{ moi.pieces | number }}</strong><span class="gris">pièces</span></div>
        </div>
        <form (ngSubmit)="changerPseudo()">
          <input class="champ" name="pseudo" [(ngModel)]="pseudo" minlength="3" maxlength="20" />
          <button class="bouton secondaire" type="submit">Renommer</button>
        </form>
        <label class="option">
          <input type="checkbox" [checked]="moi.venteAutoCommunes" (change)="basculerVenteAuto(!moi.venteAutoCommunes)" />
          Revendre automatiquement les Communes en double à l'ouverture
        </label>
        @if (message()) { <p class="succes">{{ message() }}</p> }
        @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
        <button class="lien" (click)="deconnecter()">Se déconnecter</button>
      </section>
    }
  `,
})
export class PageProfil implements OnInit {
  protected session = inject(SessionService);
  private api = inject(ApiService);
  private router = inject(Router);
  protected pseudo = this.session.moi()?.pseudo ?? '';
  protected possedees = signal(0);
  protected message = signal('');
  protected erreur = signal('');

  async ngOnInit() {
    try {
      const page = await this.api.album({ raretes: [], types: [], q: '', manquantes: false, page: 1 });
      this.possedees.set(page.possedees);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  private async maj(changements: { pseudo?: string; venteAutoCommunes?: boolean }, succes: string) {
    this.message.set('');
    this.erreur.set('');
    try {
      this.session.definir(await this.api.majMoi(changements));
      this.message.set(succes);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  changerPseudo() { return this.maj({ pseudo: this.pseudo }, 'Pseudo mis à jour.'); }
  basculerVenteAuto(actif: boolean) {
    return this.maj({ venteAutoCommunes: actif }, actif ? 'Vente automatique activée.' : 'Vente automatique désactivée.');
  }

  async deconnecter() {
    await this.api.deconnexion();
    this.session.vider();
    await this.router.navigateByUrl('/connexion');
  }
}
