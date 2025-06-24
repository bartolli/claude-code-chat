import { getUriPathBasename } from "core/util/uri";
import AcceptRejectDiffButtons from "../../../AcceptRejectDiffButtons";
import FileIcon from "../../../FileIcon";
export function PendingApplyStatesToolbar({ pendingApplyStates, }) {
    // Group apply states by filepath
    const applyStatesByFilepath = pendingApplyStates.reduce((acc, state) => {
        const filepath = state.filepath || ""; // Use empty string as fallback
        if (!acc[filepath]) {
            acc[filepath] = [];
        }
        acc[filepath].push(state);
        return acc;
    }, {});
    return (<div className="flex flex-col gap-2">
      {Object.entries(applyStatesByFilepath).map(([filepath, states]) => (<div key={filepath} className="flex justify-between gap-3">
          {filepath && (<span className="bg-badge flex min-w-0 max-w-[75%] items-center gap-1 truncate rounded pr-1 text-xs">
              <FileIcon filename={filepath} height="18px" width="18px"/>
              <span className="truncate">{getUriPathBasename(filepath)}</span>
            </span>)}
          <AcceptRejectDiffButtons applyStates={states} onAcceptOrReject={async () => { }}/>
        </div>))}
    </div>);
}
//# sourceMappingURL=PendingApplyStatesToolbar.js.map