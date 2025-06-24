import { defaultBorderRadius } from "..";
import { MODEL_PROVIDER_TAG_COLORS } from "./utils";
export function ModelProviderTag({ tag }) {
    return (<span style={{
            fontSize: "0.9em",
            backgroundColor: `${MODEL_PROVIDER_TAG_COLORS[tag]}55`,
            color: "white",
            padding: "2px 4px",
            borderRadius: defaultBorderRadius,
            marginRight: "4px",
        }}>
      {tag}
    </span>);
}
//# sourceMappingURL=ModelProviderTag.js.map