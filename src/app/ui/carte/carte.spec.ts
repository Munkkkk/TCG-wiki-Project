import { TestBed } from '@angular/core/testing';
import { CarteVisuelle } from './carte';
import { Carte } from '../../core/modeles';

const NAPOLEON: Carte = {
  id: 1, pageId: 69880, titre: 'Napoléon Ier', extrait: 'Empereur des Français.', imageUrl: 'https://img/napoleon.jpg',
  type: 'personnalite', rarete: 'legendaire', attaque: 92, defense: 88,
};

function rendre(carte: Carte, taille: 'normale' | 'mini' = 'normale') {
  const f = TestBed.createComponent(CarteVisuelle);
  f.componentRef.setInput('carte', carte);
  f.componentRef.setInput('taille', taille);
  f.detectChanges();
  return f.nativeElement.querySelector('article') as HTMLElement;
}

describe('CarteVisuelle', () => {
  it('affiche le titre, le type, les stats et le reflet holo pour une Légendaire', () => {
    const el = rendre(NAPOLEON);
    expect(el.classList).toContain('rarete-legendaire');
    expect(el.classList).toContain('holo');
    expect(el.textContent).toContain('Napoléon Ier');
    expect(el.textContent).toContain('Personnalité');
    expect(el.textContent).toContain('92');
    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://img/napoleon.jpg');
  });

  it('pas de holo pour une Commune ; initiale si pas d’image ; pas d’extrait en mini', () => {
    const el = rendre({ ...NAPOLEON, rarete: 'commune', imageUrl: null, titre: 'Ornithorynque' }, 'mini');
    expect(el.classList).not.toContain('holo');
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.sans-image')?.textContent?.trim()).toBe('O');
    expect(el.querySelector('.texte')).toBeNull();
  });
});
