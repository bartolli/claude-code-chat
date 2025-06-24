import { memo } from "react";
import Result from "./Result";
const ResultGroup = memo(function ResultGroup({ group }) {
    return (<>
      {group.map((result, i) => (<Result key={i} result={result} prevResult={group[i - 1]}></Result>))}
    </>);
});
export default ResultGroup;
//# sourceMappingURL=ResultGroup.js.map