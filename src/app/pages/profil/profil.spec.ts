import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from '../../core/api';
import { SessionService } from '../../core/session';
import { Moi } from '../../core/modeles';
import { PageProfil } from './profil';

const attendre = () => new Promise((r) => setTimeout(r, 0));

describe('PageProfil', () => {
  it('restaure la case et affiche une erreur si majMoi échoue', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ApiService,
          useValue: {
            album: () => Promise.resolve({ possedees: 3 }),
            majMoi: () => Promise.reject(new Error('boom')),
          },
        },
      ],
    });
    TestBed.inject(SessionService).definir({
      id: 1, pseudo: 'abc', pieces: 5, venteAutoCommunes: false,
    } as unknown as Moi);
    const fixture = TestBed.createComponent(PageProfil);
    fixture.detectChanges();
    await attendre();
    fixture.detectChanges();

    const boite: HTMLInputElement = fixture.nativeElement.querySelector('input[type=checkbox]');
    boite.checked = true;
    boite.dispatchEvent(new Event('change'));
    await attendre();
    fixture.detectChanges();

    expect(boite.checked).toBe(false);
    expect(boite.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.erreur')).not.toBeNull();
  });
});
