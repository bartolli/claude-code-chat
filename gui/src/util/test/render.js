import { act, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { LumpProvider } from "../../components/mainInput/Lump/LumpContext";
import { MainEditorProvider } from "../../components/mainInput/TipTapEditor";
import { AuthProvider } from "../../context/Auth";
import { IdeMessengerProvider } from "../../context/IdeMessenger";
import { MockIdeMessenger } from "../../context/MockIdeMessenger";
import ParallelListeners from "../../hooks/ParallelListeners";
import { setupStore } from "../../redux/store";
function setupMocks() {
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    }));
}
export async function renderWithProviders(ui, extendedRenderOptions = {}) {
    setupMocks();
    const ideMessenger = new MockIdeMessenger();
    const { 
    // Automatically create a store instance if no store was passed in
    store = setupStore({
        ideMessenger,
    }), routerProps = {}, ...renderOptions } = extendedRenderOptions;
    const user = userEvent.setup();
    const Wrapper = ({ children }) => (<MemoryRouter {...routerProps}>
      <IdeMessengerProvider messenger={ideMessenger}>
        <Provider store={store}>
          <AuthProvider>
            <MainEditorProvider>
              <LumpProvider>
                {children}
                <ParallelListeners />
              </LumpProvider>
            </MainEditorProvider>
          </AuthProvider>
        </Provider>
      </IdeMessengerProvider>
    </MemoryRouter>);
    let rendered;
    await act(async () => {
        rendered = render(ui, { wrapper: Wrapper, ...renderOptions });
    });
    // Return an object with the store and all of RTL's query functions
    return {
        user,
        store,
        ideMessenger,
        ...rendered,
    };
}
//# sourceMappingURL=render.js.map