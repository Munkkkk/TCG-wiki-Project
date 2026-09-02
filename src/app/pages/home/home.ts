import { Component, inject } from '@angular/core';
import {FormsModule} from '@angular/forms';
import { Card } from "../../components/card/card";
import { CardService } from '../../services/card';
import { SearchBar } from '../../components/search-bar/search-bar';

@Component({
  imports: [Card, SearchBar, FormsModule],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {

  private cardService = inject(CardService);

  search = '';

  rarityFilter = '';

  typeFilter = '';

  get cards() {
    return this.cardService.cards;
  }

  get rarities() {
    return [...new Set(this.cards.map(card => card.rarity))];
  }


  
get filteredCards() {
  return this.cards.filter(card => {

    const matchesName =
      card.name.toLowerCase().includes(this.search.toLowerCase());

    const matchesRarity =
      this.rarityFilter === '' ||
      card.rarity === this.rarityFilter;
    


    return matchesName && matchesRarity;
  });
  
}
}