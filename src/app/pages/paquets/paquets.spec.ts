import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { PagePaquets } from './paquets';
import { ApiService } from '../../core/api';
import { SessionService } from '../../core/session';
import { Moi, ResultatOuverture } from '../../core/modeles';

const MOI: Moi = {
  id: 1, pseudo: 'Munk', email: 'm@x.fr', pieces: 0, paquetsStockes: 4, paquetsMax: 10,
  prochainPaquetDansMs: 60_000, paquetsAvantPitie: 31, venteAutoCommunes: false,
};
const RESULTAT: ResultatOuverture = {
  cartes: [1, 2, 3, 4, 5].map((id) => ({
    id, pageId: id, titre: `Carte ${id}`, extrait: '', imageUrl: null, type: 'culture', rarete: 'commune',
    attaque: 50, defense: 50, nouvelle: true,
  })),
  etat: { ...MOI, paquetsStockes: 3 },
  venteAuto: null,
};

describe('PagePaquets', () => {
  it('ouvre un paquet en cliquant dessus, puis montre les dernières cartes en miniatures', async () => {
    const ouvrirPaquet = vi.fn().mockResolvedValue(RESULTAT);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), { provide: ApiService, useValue: { ouvrirPaquet } }],
    });
    TestBed.inject(SessionService).definir(MOI);
    const f = TestBed.createComponent(PagePaquets);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;

    expect(el.querySelector('.compteur')?.textContent).toContain('4');
    (el.querySelector('button.paquet') as HTMLButtonElement).click();
    await f.whenStable();
    f.detectChanges();

    expect(ouvrirPaquet).toHaveBeenCalledWith('stock');
    expect(el.querySelectorAll('.dernieres app-carte')).toHaveLength(5);
    f.destroy();
  });
});
