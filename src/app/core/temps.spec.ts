import { formatDuree } from './temps';

describe('formatDuree', () => {
  it('affiche les minutes arrondies au supérieur', () => {
    expect(formatDuree(36 * 60_000)).toBe('36 min');
    expect(formatDuree(35 * 60_000 + 1)).toBe('36 min');
  });
  it('affiche heures et minutes au-delà de 60 min', () => {
    expect(formatDuree(65 * 60_000)).toBe('1 h 05');
  });
  it('moins d’une minute', () => {
    expect(formatDuree(30_000)).toBe('moins d’une minute');
    expect(formatDuree(0)).toBe('moins d’une minute');
  });
});
