import type { LinksFunction } from '@vercel/remix'

import cursorStyles from './Cursor.css'

type Props = {
  color: string
  name: string
  x: number
  y: number
}

export const cursorLinks: LinksFunction = () => [
  { rel: 'stylesheet', href: cursorStyles },
]

export function Cursor({ color, name, x, y }: Props) {
  return (
    <div
      className="cursor"
      style={{
        transform: `translateX(${x}px) translateY(${y}px)`,
        '--colors-cursor': color,
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 15 22">
        <path
          fill={color}
          stroke="#162137"
          strokeWidth={1.5}
          d="M6.937 15.03h-.222l-.165.158L1 20.5v-19l13 13.53H6.937Z"
        />
      </svg>
      <span>{name}</span>
    </div>
  )
}

declare module 'react' {
  type CSSProperties = {
    [key: `--${string}`]: string | number
  }
}
