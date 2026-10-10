import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { PagePaquets } from './paquets';
import { ApiService } from '../../core/api';
import { SessionService } from '../../core/session';
import { Collection, Moi, ResultatOuverture } from '../../core/modeles';

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
const COLLECTION: Collection = {
  possedees: 412, tailleCatalogue: 50000,
  parRarete: { commune: 277, rare: 96, ultra_rare: 27, super_rare: 9, legendaire: 3 },
  taux: { commune: 60, rare: 25, ultra_rare: 10, super_rare: 4, legendaire: 1 },
  pitie: 50,
};

async function rendre(api: Partial<Record<keyof ApiService, unknown>>) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), { provide: ApiService, useValue: api }],
  });
  TestBed.inject(SessionService).definir(MOI);
  const f = TestBed.createComponent(PagePaquets);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

describe('PagePaquets', () => {
  it('affiche la collection par rareté, les taux et la progression de la pitié', async () => {
    const f = await rendre({ collection: vi.fn().mockResolvedValue(COLLECTION) });
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('.collection .total')?.textContent).toContain('412');
    expect([...el.querySelectorAll('.collection li em')].map((e) => e.textContent?.trim())).toEqual(['3', '9', '27', '96', '277']);
    expect([...el.querySelectorAll('.taux li em')].map((e) => e.textContent?.trim())).toEqual(['1 %', '4 %', '10 %', '25 %', '60 %']);
    expect((el.querySelector('.pitie i') as HTMLElement).style.width).toBe('38%');
    expect(el.querySelector('app-booster')).not.toBeNull();
    f.destroy();
  });

  it('ouvre un paquet en cliquant sur le booster, puis montre les dernières cartes et recharge la collection', async () => {
    const ouvrirPaquet = vi.fn().mockResolvedValue(RESULTAT);
    const collection = vi.fn().mockResolvedValue(COLLECTION);
    const f = await rendre({ ouvrirPaquet, collection });
    const el = f.nativeElement as HTMLElement;

    expect(el.querySelector('.compteur')?.textContent).toContain('4');
    (el.querySelector('button.paquet') as HTMLButtonElement).click();
    await f.whenStable();
    f.detectChanges();

    expect(ouvrirPaquet).toHaveBeenCalledWith('stock');
    expect(el.querySelectorAll('.dernieres app-carte')).toHaveLength(5);
    expect(collection).toHaveBeenCalledTimes(2);
    f.destroy();
  });
});
