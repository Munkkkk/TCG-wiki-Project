import { Component } from '@angular/core';

@Component({
  selector: 'app-pied-de-page',
  template: `
    <footer>
      Contenus issus de <a href="https://fr.wikipedia.org" target="_blank" rel="noopener">Wikipédia</a>,
      sous licence <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener">CC BY-SA 4.0</a>.
    </footer>
  `,
  styles: `footer { padding: 24px 28px 90px; color: var(--gris); font-size: 12px; border-top: 1px solid var(--bordure); margin-top: 40px; }
    @media (min-width: 768px) { footer { padding-bottom: 24px; } }`,
})
export class PiedDePage {}
