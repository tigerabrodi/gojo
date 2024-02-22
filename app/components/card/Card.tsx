import type { FocusEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  useMutation,
  useMyPresence,
  useOthers,
  useStorage,
} from "~/liveblocks.config";
import type { CardType } from "~/helpers";
import styles from "./Card.css";
import type { LinksFunction } from "@vercel/remix";
import { moveCursorToEnd } from "./utils";
import * as Toolbar from "@radix-ui/react-toolbar";
import { Trash } from "~/icons";
import { formatOrdinals, getColorWithId } from "~/helpers/functions";
import DOMPurify from "dompurify";
import { LiveList } from "@liveblocks/client";

export const CARD_DIMENSIONS = {
  width: 200,
  height: 200,
} as const;

const ARROW_KEYS = {
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
} as const;

export const cardLinks: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
];

export function Card({ card, index }: { card: CardType; index: number }) {
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });

  // Needed to properly move cursor to the end of the contentEditable span
  const [content, setContent] = useState(card.html);

  // Needed to change the cursor to text when the card content is focused
  const [isCardContentFocused, setIsCardContentFocused] = useState(false);

  // Needed to prevent focusing card content when card clicked first time
  const [hasCardBeenClickedBefore, setHasCardBeenClickedBefore] =
    useState(false);

  const cardContentRef = useRef<HTMLDivElement>(null);

  const [, updateMyPresence] = useMyPresence();
  const others = useOthers();
  const personFocusingOnThisCard = others.find(
    (person) => person.presence.selectedCardId === card.id
  );

  const zIndexOrderListWithCardIds = useStorage(
    (root) => root.zIndexOrderListWithCardIds
  );
  const cardZIndex = zIndexOrderListWithCardIds.indexOf(card.id);

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

  const bringCardToFront = useMutation(({ storage }, cardId: string) => {
    const zIndexOrderListWithCardIds = storage.get(
      "zIndexOrderListWithCardIds"
    );
    const index = zIndexOrderListWithCardIds.findIndex((id) => id === cardId);

    if (index !== -1) {
      zIndexOrderListWithCardIds.delete(index);
      zIndexOrderListWithCardIds.push(cardId);
    }
  }, []);

  const bringCardToBack = useMutation(({ storage }, cardId: string) => {
    const zIndexOrderListWithCardIds = storage
      .get("zIndexOrderListWithCardIds")
      .toArray();
    const index = zIndexOrderListWithCardIds.findIndex((id) => id === cardId);

    if (index !== -1) {
      zIndexOrderListWithCardIds.splice(index, 1);
      zIndexOrderListWithCardIds.unshift(cardId);
      storage.set(
        "zIndexOrderListWithCardIds",
        new LiveList(zIndexOrderListWithCardIds)
      );
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
        card.set("html", newHtml);
      }
    },
    []
  );

  function handleInput(event: FormEvent<HTMLSpanElement>) {
    const newHtml = event.currentTarget.innerHTML || "";
    const purifiedHtml = DOMPurify.sanitize(newHtml);
    setContent(purifiedHtml);
    updateCardContent(card.id, purifiedHtml);
  }

  // Move the cursor to the end of the contentEditable span when the content changes
  useEffect(() => {
    if (
      cardContentRef.current &&
      document.activeElement === cardContentRef.current
    ) {
      moveCursorToEnd(cardContentRef.current);
    }
  }, [content]);

  function onCardBlur(event: FocusEvent<HTMLDivElement>) {
    if (event.relatedTarget === cardContentRef.current) return;

    cardContentRef.current?.blur();
    setIsCardContentFocused(false);
    setHasCardBeenClickedBefore(false);
    updateMyPresence({ isTyping: false, selectedCardId: null });
  }

  function handleCardMove(direction: "up" | "down" | "left" | "right") {
    let newX = card.positionX;
    let newY = card.positionY;

    switch (direction) {
      case "up":
        newY -= 10;
        break;
      case "down":
        newY += 10;
        break;
      case "left":
        newX -= 10;
        break;
      case "right":
        newX += 10;
        break;
      default:
        break;
    }

    updateCardPosition(card.id, newX, newY);
  }

  function onCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && cardContentRef.current) {
      cardContentRef.current.blur();
      return;
    }

    const arrowKey = ARROW_KEYS[event.key as keyof typeof ARROW_KEYS];

    if (arrowKey) {
      switch (event.key) {
        case "ArrowUp":
          handleCardMove("up");
          break;
        case "ArrowDown":
          handleCardMove("down");
          break;
        case "ArrowLeft":
          handleCardMove("left");
          break;
        case "ArrowRight":
          handleCardMove("right");
          break;
        default:
          break;
      }

      // Prevent the page from scrolling when using arrow keys
      event.preventDefault();
    }
  }

  function scrollToTheBottomOfCardContent() {
    if (cardContentRef.current) {
      // Scroll to the bottom of the contentEditable span
      cardContentRef.current.scrollTop = cardContentRef.current.scrollHeight;
    }
  }

  const isSomeoneElseTypingOnThisCard =
    personFocusingOnThisCard &&
    personFocusingOnThisCard.presence.selectedCardId === card.id &&
    personFocusingOnThisCard.presence.isTyping;

  useEffect(() => {
    if (isSomeoneElseTypingOnThisCard) {
      scrollToTheBottomOfCardContent();
    }
  }, [isSomeoneElseTypingOnThisCard]);

  function onCardClick(event: MouseEvent<HTMLDivElement>) {
    const isCardContentCurrentlyFocused =
      document.activeElement === cardContentRef.current;

    if (isCardContentCurrentlyFocused) return;

    if (!hasCardBeenClickedBefore) {
      setHasCardBeenClickedBefore(true);
      return;
    }

    if (cardContentRef.current) {
      cardContentRef.current.focus();
      moveCursorToEnd(cardContentRef.current);
      setIsCardContentFocused(true);
      scrollToTheBottomOfCardContent();
      updateMyPresence({ isTyping: true });
    }
  }

  function onCardFocus() {
    updateMyPresence({
      selectedCardId: card.id,
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="card"
      id={card.id}
      aria-label={`${formatOrdinals(index + 1)} card`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onBlur={onCardBlur}
      onFocus={onCardFocus}
      onKeyDown={onCardKeyDown}
      onClick={onCardClick}
      onDoubleClick={(event) => {
        // Needed to prevent card from being created when double clicking
        event.stopPropagation();
      }}
      style={{
        top: card.positionY,
        left: card.positionX,
        width: CARD_DIMENSIONS.width,
        height: CARD_DIMENSIONS.height,
        zIndex: cardZIndex,
        ...(personFocusingOnThisCard
          ? {
              border: `2px solid ${getColorWithId(
                personFocusingOnThisCard.connectionId
              )}`,
            }
          : {}),
      }}
    >
      {personFocusingOnThisCard && (
        <div
          className="card-presence-name"
          style={{
            backgroundColor: getColorWithId(
              personFocusingOnThisCard.connectionId
            ),
          }}
        >
          {personFocusingOnThisCard.presence.name}
        </div>
      )}

      <div
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={`content of ${formatOrdinals(index + 1)} card`}
        ref={cardContentRef}
        onInput={handleInput}
        className="card-content"
        style={{
          cursor: isCardContentFocused ? "text" : "default",
        }}
        dangerouslySetInnerHTML={{
          __html: card.html,
        }}
      />

      <Toolbar.Root className="toolbar">
        <Toolbar.Button
          aria-label={`delete ${formatOrdinals(index + 1)} card`}
          onClick={() => onDelete(card.id)}
        >
          <Trash />
        </Toolbar.Button>
        <Toolbar.Button
          aria-label={`bring ${formatOrdinals(index + 1)} card to back`}
          onClick={() => bringCardToBack(card.id)}
        >
          Bring to back
        </Toolbar.Button>
        <Toolbar.Button
          aria-label={`bring ${formatOrdinals(index + 1)} card to front`}
          onClick={() => bringCardToFront(card.id)}
        >
          Bring to front
        </Toolbar.Button>
      </Toolbar.Root>
    </div>
  );
}
