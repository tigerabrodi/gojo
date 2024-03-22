import { useEffect, useRef, useState } from "react";
import { useMyPresence, useOthers, useStorage } from "~/liveblocks.config";
import type { CardType } from "~/helpers";
import styles from "./Card.css";
import type { LinksFunction } from "@vercel/remix";
import { moveCursorToEnd } from "./utils";
import * as Toolbar from "@radix-ui/react-toolbar";
import { Trash } from "~/icons";
import { formatOrdinals, getColorWithId } from "~/helpers/functions";
import DOMPurify from "dompurify";
import { useGetCardLiveblocksQueries } from "./liveblocks-queries";

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
  const cardRef = useRef<HTMLDivElement>(null);

  const [, updateMyPresence] = useMyPresence();
  const others = useOthers();
  const personFocusingOnThisCard = others.find(
    (person) => person.presence.selectedCardId === card.id
  );

  const zIndexOrderListWithCardIds = useStorage(
    (root) => root.zIndexOrderListWithCardIds
  );
  const cardZIndex = zIndexOrderListWithCardIds.indexOf(card.id);

  const { bringCardToFront, onDelete, updateCardPosition, updateCardContent } =
    useGetCardLiveblocksQueries();

  useEffect(() => {
    if (isDragging) {
      function handleGlobalMouseMove(event: MouseEvent) {
        if (!isDragging) return;
        const newX = event.clientX - startPosition.x;
        const newY = event.clientY - startPosition.y;
        updateCardPosition(card.id, newX, newY);
      }

      function handleGlobalMouseUp() {
        setIsDragging(false);
        window.removeEventListener("mousemove", handleGlobalMouseMove);
        window.removeEventListener("mouseup", handleGlobalMouseUp);
      }

      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleGlobalMouseMove);
        window.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [
    card.id,
    isDragging,
    startPosition.x,
    startPosition.y,
    updateCardPosition,
  ]);

  function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (document.activeElement === cardContentRef.current) {
      return;
    }

    const startX = event.clientX;
    const startY = event.clientY;

    setIsDragging(true);

    setStartPosition({
      x: startX - card.positionX,
      y: startY - card.positionY,
    });

    // Needed to prevent focusing card content when dragging
    event.preventDefault();

    // In turn, we have to focus on the card itself manually
    cardRef.current?.focus();
  }

  function handleInput(event: React.FormEvent<HTMLSpanElement>) {
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

  function onCardBlur(event: React.FocusEvent<HTMLDivElement>) {
    // If we're focusing on card content, card's blur should not be triggered
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

  function onCardKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && cardContentRef.current) {
      cardContentRef.current.blur();
      return;
    }

    // If user editing text, moving card with arrow keys should not be triggered
    if (cardContentRef.current === document.activeElement) return;

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

  function onCardClick() {
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
    bringCardToFront(card.id);

    updateMyPresence({
      selectedCardId: card.id,
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="card"
      ref={cardRef}
      id={card.id}
      aria-label={`${formatOrdinals(index + 1)} card`}
      onMouseDown={handleMouseDown}
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
      </Toolbar.Root>
    </div>
  );
}
