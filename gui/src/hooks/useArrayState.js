import { useState } from "react";
function useArrayState(initialValue) {
    const [value, setValue] = useState(initialValue);
    function add(item) {
        setValue((prev) => [...prev, item]);
    }
    function remove(index) {
        setValue((prev) => prev.filter((_, i) => i !== index));
    }
    function edit(editFn) {
        setValue((prev) => editFn(prev));
    }
    function replace(atIndex, withItem) {
        setValue((prev) => {
            let updated = [...prev];
            updated[atIndex] = withItem;
            return updated;
        });
    }
    return { value, add, remove, edit, replace };
}
export default useArrayState;
//# sourceMappingURL=useArrayState.js.map