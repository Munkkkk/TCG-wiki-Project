import { Injectable } from '@angular/core';

export interface CardData {
  name: string;
  rarity: string;
  image: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class CardService {

  cards: CardData[] = [
    {
      name: 'Charizard',
      rarity: 'Rare',
      image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f',
      description: 'Un puissant Pokémon de type Feu.'
    },
    {
      name: 'Pikachu',
      rarity: 'Common',
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
      description: 'Le célèbre Pokémon souris électrique.'
    },
    {
      name: 'Mewtwo',
      rarity: 'Ultra Rare',
      image: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68',
      description: 'Un Pokémon créé artificiellement à partir de Mew.'
    }
  ];

}