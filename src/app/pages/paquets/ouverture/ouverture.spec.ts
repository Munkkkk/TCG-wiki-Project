import { TestBed } from '@angular/core/testing';
import { Ouverture } from './ouverture';
import { ResultatOuverture, Rarete } from '../../../core/modeles';

const carte = (id: number, rarete: Rarete) => ({
  id, pageId: id, titre: `Carte ${id}`, extrait: '', imageUrl: null, type: 'culture' as const, rarete,
  attaque: 50, defense: 50, nouvelle: false,
});

function ouvrir(raretes: Rarete[]) {
  const resultat: ResultatOuverture = {
    cartes: raretes.map((r, i) => carte(i + 1, r)),
    etat: {} as ResultatOuverture['etat'],
    venteAuto: null,
  };
  const f = TestBed.createComponent(Ouverture);
  f.componentRef.setInput('resultat', resultat);
  f.detectChanges();
  const el = f.nativeElement as HTMLElement;
  el.querySelector('.paquet')!.dispatchEvent(new Event('animationend'));
  f.detectChanges();
  const cliquer = () => { (el.querySelector('.scene') as HTMLButtonElement).click(); f.detectChanges(); };
  return { el, cliquer };
}

describe('Ouverture', () => {
  it('révèle les cartes une par une, la plus rare en dernier, puis affiche le récapitulatif', () => {
    const { el, cliquer } = ouvrir(['rare', 'commune', 'commune', 'commune', 'commune']);
    expect(el.querySelector('.compteur')?.textContent?.trim()).toBe('1 / 5');
    cliquer();
    expect(el.querySelector('.aide')?.textContent).toContain('Carte 2');
    for (let i = 0; i < 7; i++) cliquer();
    expect(el.querySelector('.compteur')?.textContent?.trim()).toBe('5 / 5');
    cliquer();
    expect(el.querySelector('.aide')?.textContent).toContain('Carte 1 · Rare');
    cliquer();
    expect(el.querySelectorAll('.recap app-carte')).toHaveLength(5);
  });

  it('Légendaire : teaser avant le retournement, puis effet doré', () => {
    const { el, cliquer } = ouvrir(['legendaire', 'commune', 'commune', 'commune', 'commune']);
    for (let i = 0; i < 8; i++) cliquer();
    expect(el.querySelector('.emplacement.teaser')).not.toBeNull();
    expect(el.querySelector('app-effet-legendaire')).toBeNull();
    cliquer();
    expect(el.querySelector('app-effet-legendaire')).not.toBeNull();
    expect(el.querySelector('.emplacement.teaser')).toBeNull();
  });
});
