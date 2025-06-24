import { useContext, useEffect, useState } from "react";
import { IdeMessengerContext } from "../context/IdeMessenger";
/**
 * Generic hook for making IDE messenger requests with automatic error handling and refresh capability
 */
export function useIdeMessengerRequest(messageType, data) {
    const ideMessenger = useContext(IdeMessengerContext);
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    async function makeRequest() {
        if (!data) {
            setResult(null);
            return;
        }
        setIsLoading(true);
        try {
            const response = await ideMessenger.request(messageType, data);
            if (response.status === "success") {
                setResult(response.content);
            }
            else {
                console.error(`Error in ${messageType} request:`, response.error);
                setResult(null);
            }
        }
        finally {
            setIsLoading(false);
        }
    }
    useEffect(() => {
        makeRequest();
    }, [data, messageType]);
    return { result, isLoading, refresh: makeRequest };
}
//# sourceMappingURL=useIdeMessengerRequest.js.map