import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from '../../core/api';
import { FiltresAlbum, PageAlbum } from '../../core/modeles';
import { PageAlbumComposant } from './album';

function pageDe(titres: string[], total = titres.length): PageAlbum {
  return {
    cartes: titres.map((t, i) => ({
      id: Number(t.replace(/\D/g, '')) || i + 1, titre: t, rarete: 'commune', type: 'personne',
      quantite: 1, epinglee: false,
    })),
    total, possedees: titres.length, tailleCatalogue: 300,
  } as unknown as PageAlbum;
}

function differe() {
  let resoudre!: (p: PageAlbum) => void;
  let rejeter!: (e: unknown) => void;
  const promesse = new Promise<PageAlbum>((ok, ko) => { resoudre = ok; rejeter = ko; });
  return { promesse, resoudre, rejeter };
}

const attendre = () => new Promise((r) => setTimeout(r, 0));

describe('PageAlbumComposant', () => {
  function monter() {
    const appels: { filtres: FiltresAlbum; d: ReturnType<typeof differe> }[] = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ApiService,
          useValue: {
            album: (filtres: FiltresAlbum) => {
              const d = differe();
              appels.push({ filtres, d });
              return d.promesse;
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(PageAlbumComposant);
    fixture.detectChanges();
    return { fixture, composant: fixture.componentInstance as any, appels };
  }

  it('ignore une réponse ancienne arrivée après une plus récente', async () => {
    const { fixture, composant, appels } = monter();
    appels[0].d.resoudre(pageDe(['Initiale 1']));
    await attendre();

    composant.basculerRarete('rare');
    composant.basculerType('personne');
    expect(appels.length).toBe(3);
    appels[2].d.resoudre(pageDe(['Nouvelle 2']));
    await attendre();
    appels[1].d.resoudre(pageDe(['Ancienne 3']));
    await attendre();
    fixture.detectChanges();

    expect(composant.cartes().map((c: { titre: string }) => c.titre)).toEqual(['Nouvelle 2']);
    expect(composant.enCours()).toBe(false);
  });

  it('redemande la même page après un échec de « Voir plus »', async () => {
    const { composant, appels } = monter();
    appels[0].d.resoudre(pageDe(['Carte 1'], 5));
    await attendre();

    composant.pageSuivante();
    expect(appels[1].filtres.page).toBe(2);
    appels[1].d.rejeter(new Error('réseau'));
    await attendre();

    composant.pageSuivante();
    expect(appels[2].filtres.page).toBe(2);
  });
});
