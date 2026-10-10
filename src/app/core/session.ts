import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from './api';
import { Moi } from './modeles';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private api = inject(ApiService);
  readonly moi = signal<Moi | null>(null);
  /** Date.now() à la réception de `moi`, pour le compte à rebours. */
  readonly recuLe = signal(0);

  definir(moi: Moi) {
    this.moi.set(moi);
    this.recuLe.set(Date.now());
  }

  /**
   * Recharge le joueur. Seul un 401 vide la session (et renvoie null) ;
   * toute autre erreur (réseau, 5xx) laisse `moi` intact et est relancée.
   */
  async charger(): Promise<Moi | null> {
    try {
      this.definir(await this.api.moi());
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 401) {
        this.moi.set(null);
        return null;
      }
      throw e;
    }
    return this.moi();
  }

  vider() { this.moi.set(null); }

  majPieces(pieces: number) {
    this.moi.update((m) => (m ? { ...m, pieces } : m));
  }
}
