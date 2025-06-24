# Webview-Backend Communication Flow Analysis

## Current Architecture Issues

### The Core Problem

There are **multiple ExtensionMessageHandler instances** being created, causing a disconnect between the handler that receives webview messages and the one processing Claude responses.

## Message Flow Breakdown

### 1. Extension Activation

```typescript
// extension.ts
activate(context) {
    // ServiceContainer is initialized
    const provider = new ClaudeChatProvider(context.extensionUri, context, services);
}
```

### 2. Webview Creation

```typescript
// extension.ts - ClaudeChatProvider.show()
this._panel = vscode.window.createWebviewPanel(...);
this._setupMessageHandling();
```

### 3. Message Handler Setup (THE PROBLEM)

```typescript
// extension.ts - _setupMessageHandling()
private _setupMessageHandling() {
    // Creates a NEW ExtensionMessageHandler instance
    const messageHandler = new ExtensionMessageHandler(this._context, this._services);
    messageHandler.attach(webviewProtocol);  // This instance has webviewProtocol

    webviewProtocol.setHandler(async (type, data) => {
        return await messageHandler.handleMessage(type, data);
    });
}
```

### 4. User Sends Message

```
Webview → IdeMessenger.post('chat/sendMessage')
    → VS Code postMessage
    → SimpleWebviewProtocol receives
    → ExtensionMessageHandler.handleMessage()
    → handleChatMessage()
```

### 5. Claude Response Processing

Inside `handleChatMessage()`, the SAME instance processes the response and tries to send back:

- `this.webviewProtocol?.post('message/add')` - This works because it's the same instance

## Message Types

### From Webview to Backend

- `chat/sendMessage` - User sends a message
- `chat/newSession` - Create new chat session
- `settings/get` - Get current settings
- `settings/update` - Update settings
- `settings/selectModel` - Select AI model
- `conversation/getList` - Get conversation list

### From Backend to Webview

- `config/init` - Initial configuration
- `status/ready` - Extension is ready
- `message/add` - Add new message (user or assistant)
- `message/update` - Update existing message (streaming)
- `chat/messageComplete` - Message streaming complete
- `error/show` - Display error

## Redux State Management Issues

### Current Redux Actions

The webview App.tsx dispatches these actions:

- `session/messageAdded` - When receiving `message/add`
- `session/messageUpdated` - When receiving `message/update`
- `session/messageCompleted` - When receiving `chat/messageComplete`

### The Duplicate Message Issue

1. User types "Hi Claude" and submits
2. Backend sends `message/add` with role: 'user'
3. Redux adds the user message
4. But the message appears multiple times because:
   - The webview might be receiving duplicate messages
   - OR the Redux state is being duplicated
   - OR the component is re-rendering with stale state

## Why Messages Don't Appear

Looking at the logs:

```
[DEBUG] webviewProtocol status: available
[DEBUG] Sending message/add for assistant
```

But in the browser console, we only see:

```
SimpleWebviewProtocol: Sending message to webview - type: chat/messageComplete
```

This means `message/add` and `message/update` are NOT reaching the webview, even though the backend thinks it's sending them.

## Root Cause Analysis

The `SimpleWebviewProtocol.post()` is being called, but the messages aren't reaching the webview. This could be because:

1. The webview isn't ready to receive messages
2. The message format is incorrect
3. There's a timing issue
4. The webviewProtocol instance isn't properly connected to the actual webview

## Next Steps

1. Verify that SimpleWebviewProtocol.post() is actually sending messages
2. Check if the webview's message listener is properly set up
3. Ensure the IdeMessenger is receiving all messages from the backend
4. Fix the architecture to use a single ExtensionMessageHandler instance
