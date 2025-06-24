import React, { useEffect } from "react";
import { HoverDiv, HoverTextDiv } from "./StyledComponents";
export const DragOverlay = ({ show, setShow }) => {
    useEffect(() => {
        const overListener = (event) => {
            if (event.shiftKey)
                return;
            setShow(true);
        };
        window.addEventListener("dragover", overListener);
        const leaveListener = (event) => {
            if (event.shiftKey) {
                setShow(false);
            }
            else {
                setTimeout(() => setShow(false), 2000);
            }
        };
        window.addEventListener("dragleave", leaveListener);
        return () => {
            window.removeEventListener("dragover", overListener);
            window.removeEventListener("dragleave", leaveListener);
        };
    }, []);
    if (!show)
        return null;
    return (<>
      <HoverDiv />
      <HoverTextDiv>Hold ⇧ to drop image</HoverTextDiv>
    </>);
};
//# sourceMappingURL=DragOverlay.js.map