import { useCallback, useEffect, useState } from "react";
export const useElementSize = (ref, debounceMs = 250) => {
    const [size, setSize] = useState({
        clientWidth: 0,
        clientHeight: 0,
        scrollWidth: 0,
        scrollHeight: 0,
        isResizing: false,
    });
    // Debounced update function
    const debouncedSetSize = useCallback((measurements) => {
        let timeoutId;
        setSize((prev) => ({ ...prev, isResizing: true }));
        timeoutId = setTimeout(() => {
            setSize({
                ...measurements,
                isResizing: false,
            });
        }, debounceMs);
        return () => clearTimeout(timeoutId);
    }, [debounceMs]);
    useEffect(() => {
        if (!ref.current)
            return;
        const updateSize = () => {
            const element = ref.current;
            if (!element)
                return;
            const measurements = {
                clientWidth: element.clientWidth,
                clientHeight: element.clientHeight,
                scrollWidth: element.scrollWidth,
                scrollHeight: element.scrollHeight,
            };
            debouncedSetSize(measurements);
        };
        // Create ResizeObserver instance
        const resizeObserver = new ResizeObserver(() => {
            updateSize();
        });
        // Start observing the element
        resizeObserver.observe(ref.current);
        // Initial size calculation
        updateSize();
        // Cleanup
        return () => {
            resizeObserver.disconnect();
        };
    }, [ref, debouncedSetSize]);
    return size;
};
//# sourceMappingURL=useElementSize.js.map