import { Injectable, inject, signal } from '@angular/core';
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

  async charger(): Promise<Moi | null> {
    try {
      this.definir(await this.api.moi());
    } catch {
      this.moi.set(null);
    }
    return this.moi();
  }

  vider() { this.moi.set(null); }

  majPieces(pieces: number) {
    this.moi.update((m) => (m ? { ...m, pieces } : m));
  }
}
