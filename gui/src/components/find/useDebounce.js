import { useEffect, useState } from "react";
function useDebounceValue(value, delay = 500) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);
    return debouncedValue;
}
export default useDebounceValue;
//# sourceMappingURL=useDebounce.js.map