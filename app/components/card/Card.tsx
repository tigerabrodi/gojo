import type { LinksFunction } from '@vercel/remix'
import type { CardType } from '~/helpers'

import * as Toolbar from '@radix-ui/react-toolbar'
import DOMPurify from 'dompurify'
import { useEffect, useRef, useState } from 'react'

import styles from './Card.css'
import { useGetCardLiveblocksQueries } from './liveblocks-queries'
import { moveCursorToEnd } from './utils'

import { formatOrdinals, getColorWithId } from '~/helpers/functions'
import { Trash } from '~/icons'
import { useMyPresence, useOthers, useStorage } from '~/liveblocks.config'

export const CARD_DIMENSIONS = {
  width: 200,
  height: 200,
} as const

const ARROW_KEYS = {
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
} as const

export const cardLinks: LinksFunction = () => [
  { rel: 'stylesheet', href: styles },
]

export function Card({ card, index }: { card: CardType; index: number }) {
  const [isDragging, setIsDragging] = useState(false)

  // Needed to calculate the distance between the cursor and the card's top-left corner
  // Otherwise, the card would jump to the cursor's position when dragging
  // This would be a bad user experience
  // Hence needed to maintain relative position between the cursor and the card
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 })

  // Needed to properly move cursor to the end of the contentEditable span
  const [content, setContent] = useState(card.html)

  // Needed to change the cursor to text when the card content is focused
  const [isCardContentFocused, setIsCardContentFocused] = useState(false)

  // Needed to prevent focusing card content when card clicked first time
  const [hasCardBeenClickedBefore, setHasCardBeenClickedBefore] =
    useState(false)

  const cardContentRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const [, updateMyPresence] = useMyPresence()
  const others = useOthers()
  const personFocusingOnThisCard = others.find(
    (person) => person.presence.selectedCardId === card.id
  )

  const zIndexOrderListWithCardIds = useStorage(
    (root) => root.zIndexOrderListWithCardIds
  )
  const cardZIndex = zIndexOrderListWithCardIds.indexOf(card.id)

  const {
    bringCardToFront,
    onDelete,
    updateCardPosition,
    updateCardContent,
    updateCardSize,
  } = useGetCardLiveblocksQueries()

  useEffect(() => {
    function handleGlobalMouseMove(event: MouseEvent) {
      const newX = event.clientX - dragStartOffset.x
      const newY = event.clientY - dragStartOffset.y
      updateCardPosition(card.id, newX, newY)
    }

    function handleGlobalMouseUp() {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove)
      window.addEventListener('mouseup', handleGlobalMouseUp)

      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove)
        window.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [
    card.id,
    isDragging,
    dragStartOffset.x,
    dragStartOffset.y,
    updateCardPosition,
  ])

  function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    const isUserEditingCardContent =
      document.activeElement === cardContentRef.current
    if (isUserEditingCardContent) {
      return
    }

    const startX = event.clientX
    const startY = event.clientY

    setIsDragging(true)

    setDragStartOffset({
      x: startX - card.positionX,
      y: startY - card.positionY,
    })

    // Needed to prevent focusing card content when dragging
    event.preventDefault()

    // In turn, we have to focus on the card itself manually
    cardRef.current?.focus()
  }

  function handleInput(event: React.FormEvent<HTMLSpanElement>) {
    const newHtml = event.currentTarget.innerHTML || ''
    const purifiedHtml = DOMPurify.sanitize(newHtml)
    setContent(purifiedHtml)
    updateCardContent(card.id, purifiedHtml)
  }

  // Move the cursor to the end of the contentEditable span when the content changes
  useEffect(() => {
    if (
      cardContentRef.current &&
      document.activeElement === cardContentRef.current
    ) {
      moveCursorToEnd(cardContentRef.current)
    }
  }, [content])

  function onCardBlur(event: React.FocusEvent<HTMLDivElement>) {
    const isUserFocusingOnCardContent =
      event.relatedTarget === cardContentRef.current
    if (isUserFocusingOnCardContent) return

    cardContentRef.current?.blur()
    setIsCardContentFocused(false)
    setHasCardBeenClickedBefore(false)
    updateMyPresence({ isTyping: false, selectedCardId: null })
  }

  function handleCardMove(direction: 'up' | 'down' | 'left' | 'right') {
    let newX = card.positionX
    let newY = card.positionY

    switch (direction) {
      case 'up':
        newY -= 10
        break
      case 'down':
        newY += 10
        break
      case 'left':
        newX -= 10
        break
      case 'right':
        newX += 10
        break
      default:
        break
    }

    updateCardPosition(card.id, newX, newY)
  }

  function onCardKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && cardContentRef.current) {
      cardContentRef.current.blur()
      return
    }

    const isUserEditingCardContent =
      cardContentRef.current === document.activeElement
    if (isUserEditingCardContent) return

    const arrowKey = ARROW_KEYS[event.key as keyof typeof ARROW_KEYS]

    if (arrowKey) {
      switch (event.key) {
        case 'ArrowUp':
          handleCardMove('up')
          break
        case 'ArrowDown':
          handleCardMove('down')
          break
        case 'ArrowLeft':
          handleCardMove('left')
          break
        case 'ArrowRight':
          handleCardMove('right')
          break
        default:
          break
      }

      // Prevent the page from scrolling when using arrow keys
      event.preventDefault()
    }
  }

  function scrollToTheBottomOfCardContent() {
    if (cardContentRef.current) {
      cardContentRef.current.scrollTop = cardContentRef.current.scrollHeight
    }
  }

  const isSomeoneElseTypingOnThisCard =
    personFocusingOnThisCard &&
    personFocusingOnThisCard.presence.selectedCardId === card.id &&
    personFocusingOnThisCard.presence.isTyping

  useEffect(() => {
    if (isSomeoneElseTypingOnThisCard) {
      scrollToTheBottomOfCardContent()
    }
  }, [isSomeoneElseTypingOnThisCard])

  function onCardClick() {
    const isCardContentCurrentlyFocused =
      document.activeElement === cardContentRef.current

    if (isCardContentCurrentlyFocused) return

    if (!hasCardBeenClickedBefore) {
      setHasCardBeenClickedBefore(true)
      return
    }

    if (cardContentRef.current) {
      cardContentRef.current.focus()
      moveCursorToEnd(cardContentRef.current)
      setIsCardContentFocused(true)
      scrollToTheBottomOfCardContent()
      updateMyPresence({ isTyping: true })
    }
  }

  function onCardFocus() {
    bringCardToFront(card.id)

    updateMyPresence({
      selectedCardId: card.id,
    })
  }

  function handleResizeMouseDown(
    resizeHandlerMoustDownEvent: React.MouseEvent<HTMLDivElement>,
    corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  ) {
    // Needed to prevent card from being dragged when resizing
    resizeHandlerMoustDownEvent.stopPropagation()

    const startWidth = card.width
    const startHeight = card.height

    const startX = resizeHandlerMoustDownEvent.clientX
    const startY = resizeHandlerMoustDownEvent.clientY

    const startPosX = card.positionX
    const startPosY = card.positionY

    function handleMouseMove(mouseMoveEvent: MouseEvent) {
      let newWidth = startWidth
      let newHeight = startHeight
      let newX = startPosX
      let newY = startPosY

      const widthDiff = mouseMoveEvent.clientX - startX
      const heightDiff = mouseMoveEvent.clientY - startY

      switch (corner) {
        case 'top-left': {
          newWidth = Math.max(CARD_DIMENSIONS.width, startWidth - widthDiff)
          newHeight = Math.max(CARD_DIMENSIONS.height, startHeight - heightDiff)

          const maxNewWidthAndHeight = Math.max(newWidth, newHeight)
          newWidth = maxNewWidthAndHeight
          newHeight = maxNewWidthAndHeight

          newX = startPosX + (startWidth - maxNewWidthAndHeight)
          newY = startPosY + (startHeight - maxNewWidthAndHeight)
          break
        }

        case 'top-right': {
          newWidth = Math.max(CARD_DIMENSIONS.width, startWidth + widthDiff)
          newHeight = Math.max(CARD_DIMENSIONS.height, startHeight - heightDiff)

          const maxNewWidthAndHeight = Math.max(newWidth, newHeight)
          newWidth = maxNewWidthAndHeight
          newHeight = maxNewWidthAndHeight

          newY = startPosY + (startHeight - maxNewWidthAndHeight)
          break
        }
        case 'bottom-left': {
          newWidth = Math.max(CARD_DIMENSIONS.width, startWidth - widthDiff)
          newHeight = Math.max(CARD_DIMENSIONS.height, startHeight + heightDiff)

          const maxNewWidthAndHeight = Math.max(newWidth, newHeight)
          newWidth = maxNewWidthAndHeight
          newHeight = maxNewWidthAndHeight

          newX = startPosX + (startWidth - maxNewWidthAndHeight)
          break
        }
        case 'bottom-right': {
          newWidth = Math.max(CARD_DIMENSIONS.width, startWidth + widthDiff)
          newHeight = Math.max(CARD_DIMENSIONS.height, startHeight + heightDiff)

          const maxNewWidthAndHeight = Math.max(newWidth, newHeight)
          newWidth = maxNewWidthAndHeight
          newHeight = maxNewWidthAndHeight

          break
        }
      }

      updateCardSize(card.id, newWidth, newHeight)
      updateCardPosition(card.id, newX, newY)
    }

    function handleMouseUp() {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
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
        event.stopPropagation()
      }}
      style={{
        top: card.positionY,
        left: card.positionX,
        width: card.width,
        height: card.height,
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
          cursor: isCardContentFocused ? 'text' : 'default',
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

      <div
        className="resize-handle"
        onMouseDown={(event) => handleResizeMouseDown(event, 'top-left')}
        style={{ left: '-20px', top: '-20px', cursor: 'nwse-resize' }}
      />

      <div
        className="resize-handle"
        onMouseDown={(event) => handleResizeMouseDown(event, 'top-right')}
        style={{ right: '-20px', top: '-20px', cursor: 'nesw-resize' }}
      />
      <div
        className="resize-handle"
        onMouseDown={(event) => handleResizeMouseDown(event, 'bottom-left')}
        style={{ bottom: '-20px', left: '-20px', cursor: 'nesw-resize' }}
      />
      <div
        className="resize-handle"
        onMouseDown={(event) => handleResizeMouseDown(event, 'bottom-right')}
        style={{ bottom: '-20px', right: '-20px', cursor: 'nwse-resize' }}
      />
    </div>
  )
}
