import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  CarteDetail, Doublon, FiltresAlbum, Moi, PageAlbum, ResultatOuverture, ResultatVente,
} from './modeles';

export function messageErreur(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (typeof e.error?.message === 'string' && e.status !== 0) return e.error.message;
    if (e.status === 0 || e.status >= 500) return 'Connexion perdue, réessaie.';
  }
  return 'Une erreur est survenue, réessaie.';
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  moi() { return firstValueFrom(this.http.get<Moi>('/api/moi')); }
  majMoi(changements: { pseudo?: string; venteAutoCommunes?: boolean }) {
    return firstValueFrom(this.http.patch<Moi>('/api/moi', changements));
  }
  inscription(email: string, pseudo: string, motDePasse: string) {
    return firstValueFrom(this.http.post<Moi>('/api/auth/inscription', { email, pseudo, motDePasse }));
  }
  connexion(email: string, motDePasse: string) {
    return firstValueFrom(this.http.post<Moi>('/api/auth/connexion', { email, motDePasse }));
  }
  deconnexion() { return firstValueFrom(this.http.post<void>('/api/auth/deconnexion', {})); }
  ouvrirPaquet(source: 'stock' | 'achat') {
    return firstValueFrom(this.http.post<ResultatOuverture>('/api/paquets/ouvrir', { source }));
  }
  album(f: FiltresAlbum) {
    let params = new HttpParams().set('page', f.page);
    if (f.raretes.length) params = params.set('rarete', f.raretes.join(','));
    if (f.types.length) params = params.set('type', f.types.join(','));
    if (f.q.trim()) params = params.set('q', f.q.trim());
    if (f.manquantes) params = params.set('manquantes', '1');
    return firstValueFrom(this.http.get<PageAlbum>('/api/album', { params }));
  }
  epingler(carteId: number, epinglee: boolean) {
    return firstValueFrom(this.http.patch<{ carteId: number; epinglee: boolean }>(`/api/album/${carteId}/epingle`, { epinglee }));
  }
  carte(id: number) { return firstValueFrom(this.http.get<CarteDetail>(`/api/cartes/${id}`)); }
  doublons() { return firstValueFrom(this.http.get<{ doublons: Doublon[] }>('/api/doublons')); }
  vendre(ventes: { carteId: number; quantite: number }[]) {
    return firstValueFrom(this.http.post<ResultatVente>('/api/doublons/vendre', { ventes }));
  }
}
