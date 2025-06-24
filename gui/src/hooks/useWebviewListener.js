import { useContext, useEffect } from "react";
import { IdeMessengerContext } from "../context/IdeMessenger";
export function useWebviewListener(messageType, handler, dependencies, skip) {
    const ideMessenger = useContext(IdeMessengerContext);
    useEffect(() => {
        let listener;
        if (!skip) {
            listener = async (event) => {
                if (event.data.messageType === messageType) {
                    const result = await handler(event.data.data);
                    ideMessenger.respond(messageType, result, event.data.messageId);
                }
            };
            window.addEventListener("message", listener);
        }
        return () => {
            if (listener) {
                window.removeEventListener("message", listener);
            }
        };
    }, dependencies ? [...dependencies, skip, ideMessenger] : [skip, ideMessenger]);
}
//# sourceMappingURL=useWebviewListener.js.map