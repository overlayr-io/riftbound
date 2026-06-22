
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface CardLayout extends Rect{
  z: number,
  rotation: number,
}