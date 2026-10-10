import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navigation } from './layout/navigation/navigation';
import { PiedDePage } from './layout/pied-de-page/pied-de-page';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navigation, PiedDePage],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
