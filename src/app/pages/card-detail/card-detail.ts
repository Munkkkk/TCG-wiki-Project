import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CardData, CardService } from '../../services/card';

@Component({
  selector: 'app-card-detail',
  imports: [],
  templateUrl: './card-detail.html',
  styleUrl: './card-detail.css'
})
export class CardDetail implements OnInit {

  private route = inject(ActivatedRoute);
  private cardService = inject(CardService);
  private router = inject(Router);
  

  card: CardData | undefined;

  ngOnInit() {
    const name = this.route.snapshot.paramMap.get('name');

    this.card = this.cardService.cards.find(
      card => card.name.toLowerCase() === name?.toLowerCase()
    );
  }
  goBack(){
    this.router.navigate(['/']);
  }
}