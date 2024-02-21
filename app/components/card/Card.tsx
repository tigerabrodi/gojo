import type { FormEvent, KeyboardEvent, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "~/liveblocks.config";
import type { CardType } from "~/helpers";
import styles from "./Card.css";
import type { LinksFunction } from "@vercel/remix";
import { moveCursorToEnd } from "./utils";
import * as Toolbar from "@radix-ui/react-toolbar";
import { Trash } from "~/icons";
import { formatOrdinals } from "~/helpers/functions";
import DOMPurify from "dompurify";

export const CARD_DIMENSIONS = {
  width: 200,
  height: 200,
} as const;

export const cardLinks: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
];

export function Card({ card, index }: { card: CardType; index: number }) {
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });

  const [content, setContent] = useState(card.text);

  // Needed to change the cursor to text when the card content is focused
  // To properly re-render
  const [isCardContentFocused, setIsCardContentFocused] = useState(false);

  const cardContentRef = useRef<HTMLDivElement>(null);

  const updateCardPosition = useMutation(({ storage }, id, x, y) => {
    const card = storage.get("cards").find((card) => card.get("id") === id);
    if (card) {
      card.set("positionX", x);
      card.set("positionY", y);
    }
  }, []);

  const onDelete = useMutation(({ storage }, id: string) => {
    const cards = storage.get("cards");
    const index = cards.findIndex((card) => card.get("id") === id);
    if (index !== -1) {
      cards.delete(index);
    }
  }, []);

  function handleMouseDown(event: MouseEvent<HTMLDivElement>) {
    // If the card content is focused, we don't want to start dragging the card
    // User is editing the text
    const isCardContentCurrentlyFocused =
      document.activeElement === cardContentRef.current;
    if (isCardContentCurrentlyFocused) {
      return;
    }

    setIsDragging(true);
    setStartPosition({
      x: event.clientX - card.positionX,
      y: event.clientY - card.positionY,
    });
    event.preventDefault();
    event.currentTarget.focus();
  }

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!isDragging) return;
    const newX = event.clientX - startPosition.x;
    const newY = event.clientY - startPosition.y;
    updateCardPosition(card.id, newX, newY);
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  const updateCardContent = useMutation(
    ({ storage }, id: string, newHtml: string) => {
      const card = storage.get("cards").find((card) => card.get("id") === id);
      if (card) {
        card.set("text", newHtml);
      }
    },
    []
  );

  function onDoubleClick(event: MouseEvent<HTMLDivElement>) {
    if (cardContentRef.current) {
      cardContentRef.current.focus();

      // Needed because we're working with `contentEditable` element
      moveCursorToEnd(cardContentRef.current);

      setIsCardContentFocused(true);
    }

    // Needed to prevent card from being created when double clicking
    event.stopPropagation();
  }

  function handleInput(event: FormEvent<HTMLSpanElement>) {
    const newHtml = event.currentTarget.innerHTML || "";
    const purifiedHtml = DOMPurify.sanitize(newHtml);
    setContent(purifiedHtml); // Update the content state
    updateCardContent(card.id, purifiedHtml);
  }

  // Use useEffect to move the cursor after content updates
  useEffect(() => {
    if (
      cardContentRef.current &&
      document.activeElement === cardContentRef.current
    ) {
      moveCursorToEnd(cardContentRef.current);
    }
  }, [content]);

  function onCardBlur() {
    cardContentRef.current?.blur();
    setIsCardContentFocused(false);
  }

  function onCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && cardContentRef.current) {
      cardContentRef.current.blur();
    }
  }

  function scrollToTheBottomOfCardContent() {
    if (cardContentRef.current) {
      // Scroll to the bottom of the contentEditable span
      cardContentRef.current.scrollTop = cardContentRef.current.scrollHeight;
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="card"
      id={card.id}
      aria-label={`${formatOrdinals(index + 1)} card`}
      onDoubleClick={onDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onBlur={onCardBlur}
      onKeyDown={onCardKeyDown}
      style={{
        top: card.positionY,
        left: card.positionX,
        width: CARD_DIMENSIONS.width,
        height: CARD_DIMENSIONS.height,
      }}
    >
      <div
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={`content of ${formatOrdinals(index + 1)} card`}
        ref={cardContentRef}
        onInput={handleInput}
        className="card-content"
        onFocus={() => {
          scrollToTheBottomOfCardContent();
        }}
        style={{
          cursor: isCardContentFocused ? "text" : "default",
        }}
        dangerouslySetInnerHTML={{ __html: card.text }}
      />

      <Toolbar.Root className="toolbar">
        <Toolbar.Button
          aria-label={`delete ${formatOrdinals(index + 1)} card`}
          onClick={() => onDelete(card.id)}
        >
          <Trash />
        </Toolbar.Button>
      </Toolbar.Root>
    </div>
  );
}
