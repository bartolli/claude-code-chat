import React from 'react';
import styled from 'styled-components';
import { CheckCircleIcon, MinusCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const TodoListContainer = styled.div`
  padding: 12px 16px;
  font-size: 12px;
  font-family: var(--vscode-editor-font-family);
  color: var(--vscode-foreground);
`;

const TodoItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  
  &:hover {
    background-color: var(--vscode-list-hoverBackground);
    margin: 0 -8px;
    padding: 4px 8px;
    border-radius: 3px;
  }
`;

const TodoIcon = styled.div<{ status: string }>`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 1px;
  color: ${props => {
    switch (props.status) {
      case 'completed': return 'var(--vscode-testing-iconPassed)';
      case 'in_progress': return 'var(--vscode-progressBar-background)';
      case 'pending': return 'var(--vscode-descriptionForeground)';
      default: return 'var(--vscode-descriptionForeground)';
    }
  }};
`;

const TodoContent = styled.div`
  flex: 1;
  line-height: 1.4;
`;

const TodoId = styled.span`
  font-size: 10px;
  color: var(--vscode-descriptionForeground);
  opacity: 0.7;
  margin-left: 4px;
`;

const TodoPriority = styled.span<{ priority: string }>`
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
  margin-left: 8px;
  background-color: ${props => {
    switch (props.priority) {
      case 'high': return 'var(--vscode-inputValidation-errorBackground)';
      case 'medium': return 'var(--vscode-inputValidation-warningBackground)';
      case 'low': return 'var(--vscode-inputValidation-infoBackground)';
      default: return 'var(--vscode-badge-background)';
    }
  }};
  color: ${props => {
    switch (props.priority) {
      case 'high': return 'var(--vscode-inputValidation-errorForeground)';
      case 'medium': return 'var(--vscode-inputValidation-warningForeground)';
      case 'low': return 'var(--vscode-inputValidation-infoForeground)';
      default: return 'var(--vscode-badge-foreground)';
    }
  }};
`;

const TodoSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0 4px 0;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  border-bottom: 1px solid var(--vscode-widget-border);
  margin-bottom: 8px;
`;

const SummaryItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface TodoListFormatterProps {
  todos: Todo[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon />;
    case 'in_progress':
      return <MinusCircleIcon />;
    case 'pending':
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      );
  }
};

export const TodoListFormatter: React.FC<TodoListFormatterProps> = ({ todos }) => {
  // Calculate summary stats
  const completed = todos.filter(t => t.status === 'completed').length;
  const inProgress = todos.filter(t => t.status === 'in_progress').length;
  const pending = todos.filter(t => t.status === 'pending').length;
  const total = todos.length;
  
  return (
    <TodoListContainer>
      <TodoSummary>
        <SummaryItem>
          <CheckCircleIcon style={{ width: 14, height: 14, color: 'var(--vscode-testing-iconPassed)' }} />
          <span>{completed} completed</span>
        </SummaryItem>
        <SummaryItem>
          <MinusCircleIcon style={{ width: 14, height: 14, color: 'var(--vscode-progressBar-background)' }} />
          <span>{inProgress} in progress</span>
        </SummaryItem>
        <SummaryItem>
          <span>{pending} pending</span>
        </SummaryItem>
        <SummaryItem style={{ marginLeft: 'auto' }}>
          <span>{Math.round((completed / total) * 100)}% complete</span>
        </SummaryItem>
      </TodoSummary>
      
      {todos.map((todo) => (
        <TodoItem key={todo.id}>
          <TodoIcon status={todo.status}>
            {getStatusIcon(todo.status)}
          </TodoIcon>
          <TodoContent>
            {todo.content}
            <TodoId>#{todo.id}</TodoId>
            <TodoPriority priority={todo.priority}>
              {todo.priority}
            </TodoPriority>
          </TodoContent>
        </TodoItem>
      ))}
    </TodoListContainer>
  );
};