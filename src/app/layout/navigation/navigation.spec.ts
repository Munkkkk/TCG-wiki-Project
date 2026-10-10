import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Navigation } from './navigation';
import { SessionService } from '../../core/session';
import { Moi } from '../../core/modeles';

const MOI: Moi = {
  id: 1, pseudo: 'Munk', email: 'm@x.fr', pieces: 1240, paquetsStockes: 4, paquetsMax: 10,
  prochainPaquetDansMs: null, paquetsAvantPitie: 50, venteAutoCommunes: false,
};

function rendre() {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  TestBed.inject(SessionService).definir(MOI);
  const f = TestBed.createComponent(Navigation);
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

describe('Navigation (menu latéral)', () => {
  it('affiche les sections disponibles comme liens, les pièces et le profil', () => {
    const el = rendre();
    const liens = [...el.querySelectorAll('.lateral .entrees a.lien')].map((a) => a.getAttribute('href'));
    expect(liens).toEqual(['/paquets', '/album', '/doublons']);
    expect(el.querySelector('.lateral .pieces')?.textContent).toContain('1');
    expect(el.querySelector('.lateral a.profil')?.textContent).toContain('Munk');
  });

  it('affiche les sections à venir grisées, sans lien', () => {
    const el = rendre();
    const bientot = [...el.querySelectorAll('.lateral .bientot')];
    expect(bientot.map((b) => b.querySelector('.texte')?.textContent)).toEqual(['Duels', 'Marché', 'Amis', 'Guilde', 'Classement']);
    for (const b of bientot) {
      expect(b.querySelector('small')?.textContent).toBe('Bientôt');
      expect(b.tagName).not.toBe('A');
      expect(b.getAttribute('aria-disabled')).toBe('true');
    }
  });
});
