export interface KeywordDef {
  name: string
  color: string
}

export const KEYWORDS: KeywordDef[] = [
  { name: 'Deflect',    color: '#9C9438' },
  { name: 'Deathknell', color: '#9C9438' },
  { name: 'Ambush',     color: '#007458' },
  { name: 'Hunt',       color: '#007458' },
  { name: 'Temporary',  color: '#9C9438' },
  { name: 'Assault',    color: '#C6405E' },
  { name: 'Shield',     color: '#C6405E' },
  { name: 'Ganking',    color: '#9C9438' },
  { name: 'Stunned',    color: '#9C9438' },
  { name: 'Tank',       color: '#C6405E' },
  { name: 'Legion',     color: '#426251' },
  { name: 'Vision',     color: '#766560' },
  { name: 'Predict',    color: '#766560' },
]

export const KEYWORD_MAP = new Map(KEYWORDS.map(k => [k.name, k]))
