import { NodeViewWrapper as TiptapNodeViewWrapper, } from "@tiptap/react";
import React from "react";
export const NodeViewWrapper = ({ children, }) => {
    // Not setting this as a "p" will cause issues with foreign keyboards
    // See https://github.com/continuedev/continue/issues/3199
    const nodeViewWrapperTag = "p";
    return (<TiptapNodeViewWrapper className="my-1.5" as={nodeViewWrapperTag}>
      {children}
    </TiptapNodeViewWrapper>);
};
//# sourceMappingURL=NodeViewWrapper.js.map