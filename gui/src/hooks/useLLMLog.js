import { useEffect, useReducer } from "react";
const MAX_GROUP_LENGTH = 32;
/**
 * Appends a new result item (chunk or message) to an interaction,
 * existing iteractions must already have been copied with
 * copyInteractionForMutation().
 */
function appendItemToInteractionResult(interaction, item) {
    let lastGroup = interaction.results[interaction.results.length - 1];
    if (lastGroup == undefined || lastGroup.length == MAX_GROUP_LENGTH) {
        interaction.results.push([item]);
    }
    else {
        lastGroup.push(item);
    }
}
/**
 * Makes a copy of an interaction that can be mutated without changing
 * any objects/arrays that are part of the old state. We always make
 * a copy of the last (open) result group, so that we can simply append
 * to it; this is very slightly inefficient for the case where we're
 * handling a single end item with no results, but makes things simpler.
 */
function copyInteractionForMutation(oldInteraction) {
    const oldResults = oldInteraction.results;
    let oldLastGroup = oldInteraction.results[oldInteraction.results.length - 1];
    let newResults;
    if (oldLastGroup == undefined || oldLastGroup.length == MAX_GROUP_LENGTH) {
        newResults = [...oldInteraction.results];
    }
    else {
        newResults = oldInteraction.results.slice(0, -1);
        newResults.push([...oldLastGroup]);
    }
    return { ...oldInteraction, results: newResults };
}
function appendItemsToLLMLog(oldLog, items) {
    const oldInteractions = oldLog.interactions;
    const newInteractions = new Map();
    let order = oldLog.order;
    let interactionsAdded = false;
    // Add the new items to the log, making mutable copies of old
    // LLMInteraction as necessary
    for (const item of items) {
        let interaction = newInteractions.get(item.interactionId);
        if (interaction === undefined) {
            const oldInteraction = oldInteractions.get(item.interactionId);
            if (oldInteraction) {
                interaction = copyInteractionForMutation(oldInteraction);
            }
            else {
                interaction = {
                    results: [],
                };
                if (interactionsAdded) {
                    order.push(item.interactionId);
                }
                else {
                    order = [...order, item.interactionId];
                    interactionsAdded = true;
                }
            }
            newInteractions.set(item.interactionId, interaction);
        }
        switch (item.kind) {
            case "startChat":
            case "startComplete":
            case "startFim":
                interaction.start = item;
                break;
            case "chunk":
            case "message":
                appendItemToInteractionResult(interaction, item);
                break;
            case "success":
            case "error":
            case "cancel":
                interaction.end = item;
                break;
        }
    }
    // Copy over unchanged interactions
    for (const interactionId of oldInteractions.keys()) {
        if (!newInteractions.has(interactionId)) {
            newInteractions.set(interactionId, oldInteractions.get(interactionId));
        }
    }
    return {
        loading: false,
        interactions: newInteractions,
        order,
    };
}
function removeInteractionFromLLMLog(llmLog, interactionId) {
    const newInteractions = new Map(llmLog.interactions);
    newInteractions.delete(interactionId);
    const newOrder = llmLog.order.filter((id) => id !== interactionId);
    return {
        loading: false,
        interactions: newInteractions,
        order: newOrder,
    };
}
/**
 * Hook to accumulate log data structures based on messages passed
 * from the core. Note that each call site will create an independent
 * data structure, so this should be only used once at a toplevel
 * component.
 * @returns currently log datastructure.
 */
export default function useLLMLog() {
    const [llmLog, dispatchLlmLog] = useReducer((llmLog, message) => {
        switch (message.type) {
            case "init":
                return appendItemsToLLMLog(llmLog, message.items);
            case "item":
                return appendItemsToLLMLog(llmLog, [message.item]);
            case "remove":
                return removeInteractionFromLLMLog(llmLog, message.interactionId);
            case "clear":
                return {
                    loading: false,
                    interactions: new Map(),
                    order: [],
                };
        }
    }, {
        loading: true,
        interactions: new Map(),
        order: [],
    });
    useEffect(function () {
        // The uuid here marks the "generation" when the webview is
        // reloaded, so we don't get confused if there are inflight
        // messages from the previous generation. In particular, this
        // avoids problems when React.StrictMode runs this effect
        // twice - we don't want to process two "init" messages.
        const uuid = crypto.randomUUID();
        const onMessage = (event) => {
            if (event.data.uuid !== uuid) {
                return;
            }
            dispatchLlmLog(event.data);
        };
        window.addEventListener("message", onMessage);
        vscode.postMessage({ type: "start", uuid });
        return () => {
            vscode.postMessage({ type: "stop", uuid });
            window.removeEventListener("message", onMessage);
        };
    }, []);
    return llmLog;
}
//# sourceMappingURL=useLLMLog.js.map