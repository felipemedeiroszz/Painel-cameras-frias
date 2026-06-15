import { useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { SOCKET_URL } from "../lib/config";

export function useRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("leitura:new", (payload) => {
      window.dispatchEvent(new CustomEvent("rt:leitura", { detail: payload }));
      queryClient.invalidateQueries({ queryKey: ["leituras"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["dispositivos"] });
    });

    socket.on("evento:new", (payload) => {
      window.dispatchEvent(new CustomEvent("rt:evento", { detail: payload }));
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["dispositivos"] });
    });

    socket.on("alert:new", (payload) => {
      window.dispatchEvent(new CustomEvent("rt:alert", { detail: payload }));
    });

    socket.on("dispositivo:offline", () => {
      queryClient.invalidateQueries({ queryKey: ["dispositivos"] });
    });

    return () => {
      socket.close();
    };
  }, [queryClient]);
}
