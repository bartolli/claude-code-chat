import { useEffect, useRef } from "react";
function useUpdatingRef(value, deps = []) {
    const ref = useRef(value);
    useEffect(() => {
        ref.current = value;
    }, [value, ...deps]);
    return ref;
}
export default useUpdatingRef;
//# sourceMappingURL=useUpdatingRef.js.map