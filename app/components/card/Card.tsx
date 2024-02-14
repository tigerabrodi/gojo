import type { LinksFunction } from "@vercel/remix";

import styles from "./Card.css";
import type { CardType } from "~/helpers";

export const cardLinks: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
];

export function Card({ card }: { card: CardType }) {
  return (
    <div
      className="card"
      style={{
        top: card.positionY,
        left: card.positionX,
      }}
    >
      Card
    </div>
  );
}
