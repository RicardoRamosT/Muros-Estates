import { useQuery } from "@tanstack/react-query";
import type { Typology } from "@shared/schema";

export function usePublicTypologies() {
  const { data: typologies = [], isLoading, refetch } = useQuery<Typology[]>({
    queryKey: ["/api/public/typologies"],
    refetchOnWindowFocus: true,
  });

  return {
    typologies,
    isLoading,
    isConnected: false,
    refetch,
  };
}
