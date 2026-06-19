import type { Card, CardType, DeckList } from '@riftbound/shared'

const SECTIONS: Record<string, keyof DeckList> = {
  'Legend:': 'legend',
  'Champion:': 'champion',
  'MainDeck:': 'mainDeck',
  'Battlefields:': 'battlefields',
  'Runes:': 'runes',
  'Sideboard:': 'sideboard',
}

function randomId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function sectionCardType(section: keyof DeckList): CardType {
  switch (section) {
    case 'battlefields': return 'battlefield'
    case 'runes': return 'rune'
    case 'legend': return 'legend'
    default: return 'unit'
  }
}

export class DeckParser {
  private cardCache = new Map<string, { imageUrl: string | undefined }>()

  async parse(raw: string): Promise<DeckList> {
    const result: DeckList = {
      legend: null,
      champion: null,
      battlefields: [],
      runes: [],
      mainDeck: [],
      sideboard: [],
    }

    let currentSection: keyof DeckList | null = null

    for (let line of raw.split('\n')) {
      line = line.trim()
      if (!line) continue

      if (SECTIONS[line]) {
        currentSection = SECTIONS[line]
        continue
      }
      if (!currentSection) continue

      const match = line.match(/^(\d+)\s+(.+)$/)
      if (!match) continue

      const count = parseInt(match[1], 10)
      const name = match[2]
      const cardData = await this.fetchCardData(name)

      for (let i = 0; i < count; i++) {
        const id = randomId()
        const card: Card = {
          id,
          baseCardId: id,
          name,
          type: sectionCardType(currentSection),
          imageUrl: cardData.imageUrl ?? '',
        }

        if (currentSection === 'legend') {
          result.legend = card
          break
        }
        if (currentSection === 'champion') {
          result.champion = card
          break
        }
        const bucket = result[currentSection]
        if (Array.isArray(bucket)) bucket.push(card)
      }
    }

    return result
  }

  private async fetchCardData(name: string): Promise<{ imageUrl: string | undefined }> {
    const cached = this.cardCache.get(name)
    if (cached) return cached

    try {
      for (const param of ['exact', 'fuzzy'] as const) {
        const response = await fetch(
          `https://api.riftcodex.com/cards/name?${param}=${encodeURIComponent(name)}`,
        )
        const data = (await response.json()) as {
          items?: Array<{ media?: { image_url?: string } }>
        }
        if (data.items && data.items.length > 0) {
          const result = { imageUrl: data.items[0].media?.image_url }
          this.cardCache.set(name, result)
          return result
        }
      }
    } catch (error) {
      console.error(`Error fetching card data for ${name}:`, error)
    }

    const result = { imageUrl: undefined }
    this.cardCache.set(name, result)
    return result
  }
}
