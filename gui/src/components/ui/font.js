import { useMemo } from "react";
import { useLocalStorage } from "../../context/LocalStorage";
export const useFontSize = (modifier) => {
    const { fontSize } = useLocalStorage();
    return useMemo(() => {
        return !modifier
            ? fontSize
            : typeof modifier === "number"
                ? fontSize + modifier
                : modifier(fontSize);
    }, [fontSize]);
};
//# sourceMappingURL=font.js.map