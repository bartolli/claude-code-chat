import { visit } from 'unist-util-visit';

// Simple syntax highlighting plugin that adds language classes
const rehypeHighlightPluginImpl = (options: { isRenderingInStepContainer?: boolean } = {}) => {
    return (tree: any) => {
        visit(tree, 'element', (node) => {
            if (node.tagName === 'pre') {
                const codeElement = node.children?.find((child: any) => child.tagName === 'code');
                if (codeElement) {
                    // Extract language from className
                    const langClass = codeElement.properties?.className?.find(
                        (cls: string) => cls.startsWith('language-')
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

// Export function that returns [plugin, options] format expected by react-remark
export const rehypeHighlightPlugin = (options: { isRenderingInStepContainer?: boolean } = {}) => {
    return [rehypeHighlightPluginImpl, options];
};