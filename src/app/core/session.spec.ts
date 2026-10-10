import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from './api';
import { SessionService } from './session';
import { Moi } from './modeles';

const MOI = { id: 1, pseudo: 'Ada', pieces: 5 } as Moi;

describe('SessionService.charger', () => {
  let moiApi: ReturnType<typeof vi.fn>;
  let session: SessionService;

  beforeEach(() => {
    moiApi = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: { moi: moiApi } }] });
    session = TestBed.inject(SessionService);
  });

  it('charge le joueur', async () => {
    moiApi.mockResolvedValue(MOI);
    expect(await session.charger()).toEqual(MOI);
    expect(session.moi()).toEqual(MOI);
  });

  it('401 : vide la session et renvoie null', async () => {
    session.definir(MOI);
    moiApi.mockRejectedValue(new HttpErrorResponse({ status: 401 }));
    expect(await session.charger()).toBeNull();
    expect(session.moi()).toBeNull();
  });

  it('502 : garde le joueur et relance l’erreur', async () => {
    session.definir(MOI);
    const erreur = new HttpErrorResponse({ status: 502 });
    moiApi.mockRejectedValue(erreur);
    await expect(session.charger()).rejects.toBe(erreur);
    expect(session.moi()).toEqual(MOI);
  });
});
