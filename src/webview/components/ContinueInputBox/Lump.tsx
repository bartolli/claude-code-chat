import React, { useState } from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import {
  vscInputBackground,
  vscCommandCenterInactiveBorder,
  defaultBorderRadius,
  lightGray,
  vscForeground,
} from '../styled';
import { varWithFallback } from '../../styles/theme';
import { selectSelectedModel } from '../../../state/slices/configSlice';
import { selectClaudeStatus } from '../../../state/slices/claudeSlice';
import { selectMcpServers } from '../../../state/slices/mcpSlice';
import '../../styles/components/Lump.css';

const LumpDiv = styled.div`
  background: ${vscInputBackground};
  border-top: 1px solid ${vscCommandCenterInactiveBorder};
  border-right: 1px solid ${vscCommandCenterInactiveBorder};
  border-bottom: 1px solid ${vscInputBackground};
  border-left: 1px solid ${vscCommandCenterInactiveBorder};
  border-radius: ${defaultBorderRadius} ${defaultBorderRadius} 0 0;
  margin: 0 8px 1px 8px;
  position: relative;
`;

const LumpContent = styled.div`
  padding: 0.125rem 0.25rem;

  @media (min-width: 640px) {
    padding: 0.125rem 0.5rem;
  }
`;

const LumpToolbar = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const ToolbarSection = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.125rem;
`;

const ToolbarButton = styled.button`
  display: flex;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  color: ${lightGray};
  font-size: 11px;
  padding: 2px 3px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${vscForeground};
    background-color: rgba(255, 255, 255, 0.1);
  }

  svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }

  @media (min-width: 640px) {
    padding: 2px 4px;
  }
`;

const ToolbarLabel = styled.span`
  display: none;
  white-space: nowrap;

  @media (min-width: 640px) {
    display: inline;
  }
`;

const ContentDiv = styled.div<{ isVisible?: boolean }>`
  max-height: ${(props) => (props.isVisible ? '200px' : '0')};
  margin: ${(props) => (props.isVisible ? '4px 0' : '0')};
  opacity: ${(props) => (props.isVisible ? 1 : 0)};
  overflow: auto;
  transition: max-height 0.3s ease-in-out, margin 0.3s ease-in-out, opacity 0.2s ease-in-out;
`;

const StatusIndicator = styled.span<{ $status: 'ready' | 'processing' | 'error' | 'disconnected' }>`
  color: ${(props) => {
    switch (props.$status) {
      case 'ready':
        return varWithFallback('success');
      case 'processing':
        return varWithFallback('warning');
      case 'error':
        return varWithFallback('error');
      case 'disconnected':
        return lightGray;
      default:
        return lightGray;
    }
  }};
  font-size: 11px;
`;

const ModelDisplay = styled.span`
  color: ${lightGray};
  font-size: 11px;
  margin-right: 4px;
`;

const Separator = styled.span`
  color: ${lightGray};
  opacity: 0.5;
  margin: 0 4px;
  font-size: 11px;
`;

const MCPSettingsSection = styled.div<{ isVisible: boolean }>`
  max-height: ${props => props.isVisible ? '170px' : '0'};
  opacity: ${props => props.isVisible ? 1 : 0};
  overflow: hidden;
  transition: all 0.3s ease-in-out;
  margin-top: ${props => props.isVisible ? '8px' : '0'};
  padding: ${props => props.isVisible ? '8px' : '0 8px'};
  border-top: ${props => props.isVisible ? `1px solid ${vscCommandCenterInactiveBorder}` : 'none'};
`;

const MCPServerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const MCPServerEntry = styled.div<{ $enabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0px 8px;
  background: ${varWithFallback('list-hover')};
  border-radius: 4px;
  font-size: 11px;
  opacity: ${props => props.$enabled ? 1 : 0.5};
`;

const MCPServerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MCPServerName = styled.span<{ $enabled?: boolean }>`
  color: ${props => props.$enabled ? vscForeground : lightGray};
`;

const MCPServerStats = styled.span`
  color: ${lightGray};
  font-size: 10px;
`;

const MCPActions = styled.div`
  display: flex;
  gap: 4px;
`;

const MCPActionButton = styled.button`
  background: none;
  border: none;
  color: ${lightGray};
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: ${vscForeground};
  }
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

const MCPToggleButton = styled.button<{ $enabled?: boolean }>`
  background: none;
  border: none;
  color: ${props => props.$enabled ? varWithFallback('success') : lightGray};
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    opacity: 0.8;
  }
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

const AddServerButton = styled.button`
  width: 100%;
  padding: 6px;
  margin-top: 8px;
  background: none;
  border: 1px dashed ${vscCommandCenterInactiveBorder};
  border-radius: 4px;
  color: ${lightGray};
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${vscForeground};
    color: ${vscForeground};
    background: rgba(255, 255, 255, 0.05);
  }
`;

interface LumpProps {
  isMainInput?: boolean;
}

export const Lump: React.FC<LumpProps> = ({ isMainInput = true }) => {
  if (!isMainInput) return null;

  // Local state
  const [showMCPSettings, setShowMCPSettings] = useState(false);

  // Get data from Redux store
  const selectedModel = useSelector(selectSelectedModel);
  const claudeStatus = useSelector(selectClaudeStatus);
  const mcpServers = useSelector(selectMcpServers);

  // Determine status
  const getStatus = () => {
    if (!claudeStatus.isConnected) return 'disconnected';
    if (claudeStatus.error) return 'error';
    if (claudeStatus.isProcessing) return 'processing';
    return 'ready';
  };

  const status = getStatus();
  const statusText = {
    ready: 'Ready',
    processing: 'Processing...',
    error: 'Error',
    disconnected: 'Disconnected',
  }[status];

  return (
    <LumpDiv>
      <LumpContent>
        <LumpToolbar>
          <ToolbarSection>
            {/* Context options */}
            <ToolbarButton title="Models">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                />
              </svg>
              <ToolbarLabel>Models</ToolbarLabel>
            </ToolbarButton>

            <ToolbarButton title="Rules">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                />
              </svg>
              <ToolbarLabel>Rules</ToolbarLabel>
            </ToolbarButton>

            <ToolbarButton title="Docs">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                />
              </svg>
              <ToolbarLabel>Docs</ToolbarLabel>
            </ToolbarButton>

            <ToolbarButton title="Prompts">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                />
              </svg>
              <ToolbarLabel>Prompts</ToolbarLabel>
            </ToolbarButton>

            <ToolbarButton title="Tools">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
                />
              </svg>
              <ToolbarLabel>Tools</ToolbarLabel>
            </ToolbarButton>

            <ToolbarButton 
              title="MCP"
              onClick={() => setShowMCPSettings(!showMCPSettings)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"
                />
              </svg>
              <ToolbarLabel>MCP</ToolbarLabel>
            </ToolbarButton>
          </ToolbarSection>

          <ToolbarSection>
            {/* Settings button */}
            <ToolbarButton
              title="Settings"
              onClick={() => {
                // TODO: Open settings
                console.log('Open settings');
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </ToolbarButton>

            {/* Model and status display */}
            {selectedModel && <ModelDisplay>{selectedModel.name || selectedModel.id}</ModelDisplay>}
            <Separator>•</Separator>
            <StatusIndicator $status={status}>{statusText}</StatusIndicator>
          </ToolbarSection>
        </LumpToolbar>
        
        <MCPSettingsSection isVisible={showMCPSettings}>
          <MCPServerList>
            {mcpServers.length > 0 ? (
              mcpServers.map((server) => (
                <MCPServerEntry key={server.name} $enabled={server.enabled}>
                  <MCPServerInfo>
                    <StatusIndicator $status={server.enabled ? (server.status === 'connected' ? 'ready' : server.status === 'error' ? 'error' : 'disconnected') : 'disconnected'}>
                      ●
                    </StatusIndicator>
                    <MCPServerName $enabled={server.enabled}>{server.name}</MCPServerName>
                    <MCPServerStats>
                      {server.toolCount || 0} tools • {server.promptCount || 0} prompts
                      {!server.enabled && ' (disabled)'}
                    </MCPServerStats>
                  </MCPServerInfo>
                  <MCPActions>
                    <MCPToggleButton 
                      $enabled={server.enabled}
                      title={server.enabled ? "Disable server" : "Enable server"}
                      onClick={() => console.log('Toggle MCP server:', server.name, !server.enabled)}
                    >
                      {server.enabled ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l2 2 4-4" />
                        </svg>
                      )}
                    </MCPToggleButton>
                    <MCPActionButton 
                      title="Refresh"
                      onClick={() => console.log('Refresh MCP server:', server.name)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </MCPActionButton>
                  </MCPActions>
                </MCPServerEntry>
              ))
            ) : (
              <MCPServerEntry>
                <MCPServerInfo style={{ opacity: 0.7 }}>
                  <MCPServerName>No MCP servers configured</MCPServerName>
                </MCPServerInfo>
              </MCPServerEntry>
            )}
          </MCPServerList>
          
          <AddServerButton onClick={() => console.log('Add MCP Server')}>
            + Add MCP Servers
          </AddServerButton>
        </MCPSettingsSection>
      </LumpContent>
    </LumpDiv>
  );
};
