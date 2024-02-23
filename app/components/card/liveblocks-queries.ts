import { LiveList } from "@liveblocks/client";
import { useMutation } from "~/liveblocks.config";

export function useGetCardLiveblocksQueries() {
  const updateCardPosition = useMutation(
    ({ storage }, id: string, x: number, y: number) => {
      const card = storage.get("cards").find((card) => card.get("id") === id);
      if (card) {
        card.set("positionX", x);
        card.set("positionY", y);
      }
    },
    []
  );

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

  const updateCardContent = useMutation(
    ({ storage }, id: string, newHtml: string) => {
      const card = storage.get("cards").find((card) => card.get("id") === id);
      if (card) {
        card.set("html", newHtml);
      }
    },
    []
  );

  return {
    updateCardPosition,
    onDelete,
    bringCardToFront,
    bringCardToBack,
    updateCardContent,
  };
}
