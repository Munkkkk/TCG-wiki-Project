import { Component, input } from '@angular/core';
import { Icone } from './liens';

/** Icônes au trait du menu (SVG inline). */
@Component({
  selector: 'app-icone',
  host: { 'aria-hidden': 'true' },
  styles: `:host { display: inline-flex; } svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }`,
  template: `
    <svg viewBox="0 0 24 24">
      @switch (nom()) {
        @case ('paquets') { <rect x="4" y="7" width="16" height="13" rx="2" /><path d="M4 11h16M12 7v13" /> }
        @case ('album') { <rect x="4" y="4" width="7" height="7" /><rect x="13" y="4" width="7" height="7" /><rect x="4" y="13" width="7" height="7" /><rect x="13" y="13" width="7" height="7" /> }
        @case ('doublons') { <path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5M18 3v4h-4M6 21v-4h4" /> }
        @case ('profil') { <circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /> }
        @case ('duels') { <path d="M5 3l9 9M3 5l2-2M14 12l-3 3M19 3l-9 9M21 5l-2-2M10 12l3 3M7 17l-3 3M17 17l3 3" /> }
        @case ('marche') { <path d="M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6" /> }
        @case ('amis') { <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.2 2.6 3.5 5.5" /> }
        @case ('classement') { <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /> }
      }
    </svg>
  `,
})
export class IconeMenu {
  nom = input.required<Icone>();
}
