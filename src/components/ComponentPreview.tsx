import React from 'react';
import { styled } from 'storybook/internal/theming';
import { CopyIcon } from '@storybook/icons';
import type { GeneratedComponent } from '../types';

interface ComponentPreviewProps {
  component: GeneratedComponent;
  onCopyProps: (props: Record<string, unknown>) => void;
}

const Container = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}));

const Header = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

const ComponentName = styled.span(({ theme }) => ({
  fontSize: '11px',
  fontWeight: 600,
  color: theme.color.secondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}));

const CopyButton = styled.button(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  fontSize: '10px',
  color: theme.color.mediumdark,
  backgroundColor: 'transparent',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: theme.background.app,
    color: theme.color.defaultText,
  },
  '& svg': {
    width: '12px',
    height: '12px',
  },
}));

const PreviewArea = styled.div(({ theme }) => ({
  padding: '12px',
  backgroundColor: theme.background.app,
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: '6px',
}));

const PropsDisplay = styled.pre(({ theme }) => ({
  margin: 0,
  padding: '8px',
  fontSize: '11px',
  fontFamily: 'monospace',
  color: theme.color.defaultText,
  backgroundColor: theme.background.hoverable,
  borderRadius: '4px',
  overflow: 'auto',
  maxHeight: '100px',
}));

const NoPreviewMessage = styled.div(({ theme }) => ({
  fontSize: '11px',
  color: theme.color.mediumdark,
  fontStyle: 'italic',
  padding: '8px 0',
}));

/**
 * Displays a preview of a generated component with its props
 */
export function ComponentPreview({
  component,
  onCopyProps,
}: ComponentPreviewProps) {
  const handleCopyClick = () => {
    onCopyProps(component.props);
  };

  return (
    <Container>
      <Header>
        <ComponentName>{component.componentName}</ComponentName>
        <CopyButton onClick={handleCopyClick} title="Copy props to clipboard">
          <CopyIcon />
          Copy Props
        </CopyButton>
      </Header>

      {component.element ? (
        <PreviewArea>{component.element}</PreviewArea>
      ) : (
        <NoPreviewMessage>
          Component preview available in story iframe
        </NoPreviewMessage>
      )}

      <PropsDisplay>{JSON.stringify(component.props, null, 2)}</PropsDisplay>
    </Container>
  );
}
