import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, messageErreur } from '../../core/api';
import { SessionService } from '../../core/session';

@Component({
  selector: 'app-page-auth',
  imports: [FormsModule, RouterLink],
  styleUrl: './auth.css',
  template: `
    <section class="carte-auth">
      <h1>{{ inscription ? 'Créer un compte' : 'Connexion' }}</h1>
      <p class="gris">{{ inscription ? '10 paquets offerts pour commencer.' : 'Content de te revoir.' }}</p>
      <form (ngSubmit)="valider()">
        <label>Email <input class="champ" type="email" name="email" [(ngModel)]="email" required autocomplete="email" /></label>
        @if (inscription) {
          <label>Pseudo <input class="champ" name="pseudo" [(ngModel)]="pseudo" required minlength="3" maxlength="20" /></label>
        }
        <label>Mot de passe
          <input class="champ" type="password" name="motDePasse" [(ngModel)]="motDePasse" required
            [attr.autocomplete]="inscription ? 'new-password' : 'current-password'" />
        </label>
        @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
        <button class="bouton" type="submit" [disabled]="enCours()">{{ inscription ? 'Créer mon compte' : 'Se connecter' }}</button>
      </form>
      @if (inscription) {
        <p class="gris">Déjà un compte ? <a routerLink="/connexion">Se connecter</a></p>
      } @else {
        <p class="gris">Pas encore de compte ? <a routerLink="/inscription">Créer un compte</a></p>
      }
    </section>
  `,
})
export class PageAuth {
  private api = inject(ApiService);
  private session = inject(SessionService);
  private router = inject(Router);
  protected inscription = inject(ActivatedRoute).snapshot.data['mode'] === 'inscription';

  protected email = '';
  protected pseudo = '';
  protected motDePasse = '';
  protected erreur = signal('');
  protected enCours = signal(false);

  async valider() {
    this.enCours.set(true);
    this.erreur.set('');
    try {
      const moi = this.inscription
        ? await this.api.inscription(this.email, this.pseudo, this.motDePasse)
        : await this.api.connexion(this.email, this.motDePasse);
      this.session.definir(moi);
      await this.router.navigateByUrl('/paquets');
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.enCours.set(false);
    }
  }
}
