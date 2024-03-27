import { useMutation } from '~/liveblocks.config'

export function useGetCardLiveblocksQueries() {
  const updateCardPosition = useMutation(
    ({ storage }, id: string, x: number, y: number) => {
      const card = storage.get('cards').find((card) => card.get('id') === id)
      if (card) {
        card.set('positionX', x)
        card.set('positionY', y)
      }
    },
    []
  )

  const onDelete = useMutation(({ storage }, id: string) => {
    const cards = storage.get('cards')
    const index = cards.findIndex((card) => card.get('id') === id)
    if (index !== -1) {
      cards.delete(index)
    }
  }, [])

  const bringCardToFront = useMutation(({ storage }, cardId: string) => {
    const zIndexOrderListWithCardIds = storage.get('zIndexOrderListWithCardIds')
    const index = zIndexOrderListWithCardIds.findIndex((id) => id === cardId)

    if (index !== -1) {
      zIndexOrderListWithCardIds.delete(index)
      zIndexOrderListWithCardIds.push(cardId)
    }
  }, [])

  const updateCardContent = useMutation(
    ({ storage }, id: string, newHtml: string) => {
      const card = storage.get('cards').find((card) => card.get('id') === id)
      if (card) {
        card.set('html', newHtml)
      }
    },
    []
  )

  const updateCardSize = useMutation(
    ({ storage }, id: string, width: number, height: number) => {
      const card = storage.get('cards').find((card) => card.get('id') === id)
      if (card) {
        card.set('width', width)
        card.set('height', height)
      }
    },
    []
  )

  return {
    updateCardPosition,
    onDelete,
    bringCardToFront,
    updateCardContent,
    updateCardSize,
  }
}
