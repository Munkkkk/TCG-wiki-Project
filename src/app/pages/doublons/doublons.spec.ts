import { TestBed } from '@angular/core/testing';
import { ApiService } from '../../core/api';
import { SessionService } from '../../core/session';
import { Doublon } from '../../core/modeles';
import { PageDoublons } from './doublons';

const D: Doublon = { carteId: 1, titre: 'C1', rarete: 'commune', type: 'culture', imageUrl: null, vendables: 2, prixUnitaire: 5 };

async function monter() {
  const api = {
    doublons: vi.fn().mockResolvedValue({ doublons: [D] }),
    vendre: vi.fn().mockResolvedValue({ cartesVendues: 2, piecesGagnees: 10, pieces: 10 }),
  };
  TestBed.configureTestingModule({
    providers: [{ provide: ApiService, useValue: api }, { provide: SessionService, useValue: { majPieces: vi.fn() } }],
  });
  const f = TestBed.createComponent(PageDoublons);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return { f, api, el: f.nativeElement as HTMLElement };
}

describe('PageDoublons', () => {
  it('ne poste pas de vente vide', async () => {
    const { f, api } = await monter();
    await (f.componentInstance as any).vendre();
    expect(api.vendre).not.toHaveBeenCalled();
  });

  it('affiche la quantité bornée après saisie de 99', async () => {
    const { f, el } = await monter();
    const input = el.querySelector('input.quantite') as HTMLInputElement;
    input.value = '99';
    input.dispatchEvent(new Event('change'));
    f.detectChanges();
    expect(input.value).toBe('2');
    input.value = '99';
    input.dispatchEvent(new Event('change'));
    f.detectChanges();
    expect(input.value).toBe('2');
  });

  it('referme la confirmation et désactive Confirmer quand la sélection devient vide', async () => {
    const { f, el } = await monter();
    const c = f.componentInstance as any;
    c.majSelection(new Map([[1, 2]]));
    c.confirmation.set(true);
    f.detectChanges();
    c.majSelection(new Map());
    f.detectChanges();
    expect(c.confirmation()).toBe(false);
    expect(el.textContent).toContain('Vendre la sélection');
  });
});
