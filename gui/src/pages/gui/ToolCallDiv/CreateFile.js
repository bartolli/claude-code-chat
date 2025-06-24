import { getMarkdownLanguageTagForFile } from "core/util";
import StyledMarkdownPreview from "../../../components/StyledMarkdownPreview";
export function CreateFile(props) {
    if (!props.fileContents) {
        return null;
    }
    const src = `\`\`\`${getMarkdownLanguageTagForFile(props.relativeFilepath ?? "output.txt")} ${props.relativeFilepath}\n${props.fileContents ?? ""}\n\`\`\``;
    return props.relativeFilepath ? (<StyledMarkdownPreview isRenderingInStepContainer disableManualApply source={src} itemIndex={props.historyIndex}/>) : null;
}
//# sourceMappingURL=CreateFile.js.map