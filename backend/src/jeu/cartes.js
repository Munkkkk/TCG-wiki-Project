export function versCarteVue(c) {
  return {
    id: c.id,
    pageId: c.page_id,
    titre: c.titre,
    extrait: c.extrait ?? '',
    imageUrl: c.image_url,
    type: c.type,
    rarete: c.rarete,
    attaque: c.attaque,
    defense: c.defense,
  };
}
