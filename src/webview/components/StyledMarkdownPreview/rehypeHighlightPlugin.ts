import { visit } from 'unist-util-visit';

/**
 * Implementation of a rehype plugin that adds language metadata to code blocks.
 * This plugin visits all pre elements and extracts the language from nested code elements,
 * adding it as a data-language attribute on the pre element for styling purposes.
 *
 * @param options - Configuration options for the plugin
 * @param options.isRenderingInStepContainer - Whether the content is being rendered inside a step container
 * @returns A transformer function that processes the syntax tree
 */
const rehypeHighlightPluginImpl = (
  options: {
    /**
     * Whether the content is being rendered inside a step container
     */
    isRenderingInStepContainer?: boolean;
  } = {}
) => {
  return (tree: any) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'pre') {
        const codeElement = node.children?.find((child: any) => child.tagName === 'code');
        if (codeElement) {
          // Extract language from className
          const langClass = codeElement.properties?.className?.find((cls: string) =>
            cls.startsWith('language-')
          );

          if (langClass) {
            const language = langClass.replace('language-', '');
            node.properties = node.properties || {};
            node.properties['data-language'] = language;
          }
        }
      }
    });

    // Explicitly return void to satisfy TypeScript
    return;
  };
};

/**
 * Exports a rehype plugin for syntax highlighting in the format expected by react-remark.
 * This function wraps the plugin implementation and returns it with its options as a tuple.
 *
 * @param options - Configuration options for the plugin
 * @param options.isRenderingInStepContainer - Whether the content is being rendered inside a step container
 * @returns A tuple containing the plugin implementation and its options
 */
export const rehypeHighlightPlugin = (
  options: {
    /**
     * Whether the content is being rendered inside a step container
     */
    isRenderingInStepContainer?: boolean;
  } = {}
) => {
  return [rehypeHighlightPluginImpl, options];
};
