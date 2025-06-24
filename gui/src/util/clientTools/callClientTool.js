import { BuiltInToolNames } from "core/tools/builtIn";
import { editToolImpl } from "./editImpl";
export async function callClientTool(toolCallState, extras) {
    const { toolCall, parsedArgs } = toolCallState;
    try {
        let output;
        switch (toolCall.function.name) {
            case BuiltInToolNames.EditExistingFile:
                output = await editToolImpl(parsedArgs, toolCall.id, extras);
                break;
            default:
                throw new Error(`Invalid client tool name ${toolCall.function.name}`);
        }
        return {
            ...output,
            errorMessage: undefined,
        };
    }
    catch (e) {
        let errorMessage = `${e}`;
        if (e instanceof Error) {
            errorMessage = e.message;
        }
        return {
            respondImmediately: true,
            errorMessage,
            output: undefined,
        };
    }
}
//# sourceMappingURL=callClientTool.js.map