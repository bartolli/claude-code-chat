import { MessageIde } from "core/protocol/messenger/messageIde";
import { createContext } from "react";
import { v4 as uuidv4 } from "uuid";
import { isJetBrains } from "../util";
export class IdeMessenger {
    ide;
    constructor() {
        this.ide = new MessageIde(async (messageType, data) => {
            const result = await this.request(messageType, data);
            if (result.status === "error") {
                throw new Error(result.error);
            }
            return result.content;
        }, () => { });
    }
    _postToIde(messageType, data, messageId = uuidv4()) {
        if (typeof vscode === "undefined") {
            if (isJetBrains()) {
                if (window.postIntellijMessage === undefined) {
                    console.log("Unable to send message: postIntellijMessage is undefined. ", messageType, data);
                    throw new Error("postIntellijMessage is undefined");
                }
                window.postIntellijMessage?.(messageType, data, messageId);
                return;
            }
            else {
                console.log("Unable to send message: vscode is undefined", messageType, data);
                return;
            }
        }
        const msg = {
            messageId,
            messageType,
            data,
        };
        vscode.postMessage(msg);
    }
    post(messageType, data, messageId, attempt = 0) {
        try {
            this._postToIde(messageType, data, messageId);
        }
        catch (error) {
            if (attempt < 5) {
                console.log(`Attempt ${attempt} failed. Retrying...`);
                setTimeout(() => this.post(messageType, data, messageId, attempt + 1), Math.pow(2, attempt) * 1000);
            }
            else {
                console.error("Max attempts reached. Message could not be sent.", error);
            }
        }
    }
    respond(messageType, data, messageId) {
        this._postToIde(messageType, data, messageId);
    }
    request(messageType, data) {
        const messageId = uuidv4();
        return new Promise((resolve) => {
            const handler = (event) => {
                if (event.data.messageId === messageId) {
                    window.removeEventListener("message", handler);
                    resolve(event.data.data);
                }
            };
            window.addEventListener("message", handler);
            this.post(messageType, data, messageId);
        });
    }
    /**
     * Because of weird type stuff, we're actually yielding an array of the things
     * that are streamed. For example, if the return type here says
     * AsyncGenerator<ChatMessage>, then it's actually AsyncGenerator<ChatMessage[]>.
     * This needs to be handled by the caller.
     *
     * Using unknown for now to make this more explicit
     */
    async *streamRequest(messageType, data, cancelToken) {
        const messageId = uuidv4();
        this.post(messageType, data, messageId);
        const buffer = [];
        let index = 0;
        let done = false;
        let returnVal = undefined;
        let error = null;
        // This handler receieves individual WebviewMessengerResults
        // And pushes them to buffer
        const handler = (event) => {
            if (event.data.messageId === messageId) {
                const responseData = event.data.data;
                if ("error" in responseData) {
                    error = responseData.error;
                    return;
                    // throw new Error(responseData.error);
                }
                if (responseData.done) {
                    window.removeEventListener("message", handler);
                    done = true;
                    returnVal = responseData.content;
                }
                else {
                    buffer.push(responseData.content);
                }
            }
        };
        window.addEventListener("message", handler);
        const handleAbort = () => {
            this.post("abort", undefined, messageId);
        };
        cancelToken?.addEventListener("abort", handleAbort);
        try {
            while (!done) {
                if (error) {
                    throw error;
                }
                if (buffer.length > index) {
                    const chunks = buffer.slice(index);
                    index = buffer.length;
                    yield chunks;
                }
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
            if (buffer.length > index) {
                const chunks = buffer.slice(index);
                yield chunks;
            }
            if (!returnVal) {
                return undefined;
            }
            return returnVal;
        }
        catch (e) {
            throw e;
        }
        finally {
            cancelToken?.removeEventListener("abort", handleAbort);
        }
    }
    async *llmStreamChat(msg, cancelToken) {
        const gen = this.streamRequest("llm/streamChat", msg, cancelToken);
        let next = await gen.next();
        while (!next.done) {
            yield next.value;
            next = await gen.next();
        }
        return next.value;
    }
}
export const IdeMessengerContext = createContext(new IdeMessenger());
export const IdeMessengerProvider = ({ children, messenger = new IdeMessenger() }) => {
    return (<IdeMessengerContext.Provider value={messenger}>
      {children}
    </IdeMessengerContext.Provider>);
};
//# sourceMappingURL=IdeMessenger.js.map