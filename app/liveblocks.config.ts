import type { CardType } from './helpers'
import type { LiveList, LiveObject } from '@liveblocks/client'

import { createClient } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'

const client = createClient({
  authEndpoint: '/api/liveblocks-auth',
})

type Presence = {
  cursor: { x: number; y: number } | null
  name: string
  selectedCardId: string | null
  isTyping: boolean
}

export type Storage = {
  cards: LiveList<LiveObject<CardType>>
  zIndexOrderListWithCardIds: LiveList<string>
  boardName: string
}

type UserMeta = {
  id: string
  info: {
    email: string
  }
}

export type RoomEvent = {
  type: 'board-deleted'
}

export const {
  suspense: {
    RoomProvider,
    useOthers,
    useSelf,
    useMyPresence,
    useStorage,
    useMutation,
    useStatus,
    useEventListener,
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client)
