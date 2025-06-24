import { PencilIcon } from "@heroicons/react/24/outline";
import { useContext } from "react";
import { useAuth } from "../../../context/Auth";
import { IdeMessengerContext } from "../../../context/IdeMessenger";
function isUsesBlock(block) {
    return typeof block !== "string" && "uses" in block;
}
export default function EditBlockButton({ block, blockType, className = "", }) {
    const ideMessenger = useContext(IdeMessengerContext);
    const { selectedProfile } = useAuth();
    const openUrl = (path) => ideMessenger.request("controlPlane/openUrl", {
        path,
        orgSlug: undefined,
    });
    const handleEdit = () => {
        if (selectedProfile?.profileType === "local") {
            ideMessenger.post("config/openProfile", {
                profileId: undefined,
            });
        }
        else if (block && isUsesBlock(block)) {
            openUrl(`${block.uses}/new-version`);
        }
        else if (selectedProfile?.fullSlug) {
            const slug = `${selectedProfile.fullSlug.ownerSlug}/${selectedProfile.fullSlug.packageSlug}`;
            openUrl(`${slug}/new-version`);
        }
    };
    return (<PencilIcon className={`h-3 w-3 cursor-pointer text-gray-400 hover:brightness-125 ${className}`} onClick={handleEdit}/>);
}
//# sourceMappingURL=EditBlockButton.js.map