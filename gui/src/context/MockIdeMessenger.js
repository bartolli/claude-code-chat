import { AuthType } from "core/control-plane/AuthTypes";
import { MessageIde } from "core/protocol/messenger/messageIde";
async function defaultMockHandleMessage(messageType, data) {
    function returnFor(_, value) {
        return value;
    }
    switch (messageType) {
        case "history/list":
            return returnFor("history/list", [
                {
                    title: "Session 1",
                    sessionId: "session-1",
                    dateCreated: new Date().toString(),
                    workspaceDirectory: "/tmp",
                },
            ]);
        case "getControlPlaneSessionInfo":
            return returnFor("getControlPlaneSessionInfo", {
                AUTH_TYPE: AuthType.WorkOsStaging,
                accessToken: "",
                account: {
                    label: "",
                    id: "",
                },
            });
        case "config/getSerializedProfileInfo":
            return returnFor("config/getSerializedProfileInfo", {
                organizations: [],
                profileId: "test-profile",
                result: {
                    config: undefined,
                    errors: [],
                    configLoadInterrupted: false,
                },
                selectedOrgId: "local",
            });
        default:
            throw new Error(`Unknown message type ${messageType}`);
    }
}
export class MockIdeMessenger {
    ide;
    messageHandlers = new Map();
    constructor() {
        this.ide = new MessageIde((messageType, data) => {
            throw new Error("Not implemented");
        }, (messageType, callback) => {
            // Store the callback in our handlers map
            if (!this.messageHandlers.has(messageType)) {
                this.messageHandlers.set(messageType, []);
            }
            this.messageHandlers.get(messageType)?.push(callback);
        });
    }
    /**
     * Simulates a message being sent from the IDE to the webview
     * @param messageType The type of message to send
     * @param data The data to send with the message
     */
    mockMessageToWebview(messageType, data) {
        // Create a message object that matches what the useWebviewListener hook expects
        const messageData = {
            messageType,
            data,
            messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        };
        // Dispatch a custom message event that the window event listener will pick up
        window.dispatchEvent(new MessageEvent("message", {
            data: messageData,
            origin: window.location.origin,
        }));
    }
    async *llmStreamChat(msg, cancelToken) {
        yield [
            {
                role: "assistant",
                content: "This is a test",
            },
        ];
        return undefined;
    }
    post(messageType, data, messageId, attempt) { }
    async request(messageType, data) {
        const content = await defaultMockHandleMessage(messageType, data);
        return {
            status: "success",
            content,
            done: true,
        };
    }
    respond(messageType, data, messageId) { }
    async *streamRequest(messageType, data, cancelToken) {
        return undefined;
    }
}
//# sourceMappingURL=MockIdeMessenger.js.map