import { ConversationStarterCards } from "../../components/ConversationStarters";
import { ExploreHubCard } from "../../components/ExploreHubCard";
import { OnboardingCard } from "../../components/OnboardingCard";
export function EmptyChatBody({ showOnboardingCard }) {
    if (showOnboardingCard) {
        return (<div className="mx-2 mt-6">
        <OnboardingCard />
      </div>);
    }
    return (<div className="mx-2 mt-2">
      <ExploreHubCard />
      <ConversationStarterCards />
    </div>);
}
//# sourceMappingURL=EmptyChatBody.js.map