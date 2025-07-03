/**
 * MessageSegmenter Service
 * 
 * Handles segmentation of Claude's streaming responses into separate message blocks
 * based on natural break points in the conversation flow.
 */

export interface MessageSegment {
    id: string;
    content: string;
    role: 'assistant';
    segmentType: 'intro' | 'tool-preface' | 'tool-response' | 'continuation';
    toolUses?: any[]; // Tools associated with this segment
    timestamp: number;
    parentMessageId?: string; // Links segments from the same stream
}

export interface SegmentationState {
    currentSegment: MessageSegment | null;
    segments: MessageSegment[];
    pendingTools: any[];
    streamId: string;
    lastSegmentType?: 'text' | 'tool';
}

export class MessageSegmenter {
    public state: SegmentationState;
    
    constructor() {
        this.state = this.createInitialState();
    }
    
    /**
     * Reset the segmenter for a new message stream
     */
    public reset(streamId: string): void {
        this.state = this.createInitialState(streamId);
    }
    
    /**
     * Process a new text chunk from the stream
     */
    public processTextChunk(text: string): MessageSegment | null {
        // If we just processed tools, create a new segment for the response
        if (this.state.lastSegmentType === 'tool' && text.trim()) {
            this.finalizeCurrentSegment();
            this.createNewSegment('tool-response', text);
            return this.state.currentSegment;
        }
        
        // If no current segment, create one
        if (!this.state.currentSegment) {
            this.createNewSegment('intro', text);
            return this.state.currentSegment;
        }
        
        // Check for natural break points in the text
        const breakPoint = this.detectBreakPoint(text);
        if (breakPoint) {
            this.finalizeCurrentSegment();
            this.createNewSegment(breakPoint.type, breakPoint.remainingText);
            return this.state.currentSegment;
        }
        
        // Otherwise, append to current segment
        this.state.currentSegment.content += text;
        return null; // No new segment created
    }
    
    /**
     * Process a tool use event
     */
    public processToolUse(tool: any): void {
        // Add tool to pending list
        this.state.pendingTools.push(tool);
        this.state.lastSegmentType = 'tool';
        
        // If we have a current segment with content, attach the tools to it
        if (this.state.currentSegment && this.state.currentSegment.content.trim()) {
            this.state.currentSegment.toolUses = [...this.state.pendingTools];
            this.state.pendingTools = [];
        }
    }
    
    /**
     * Finalize the streaming session
     */
    public finalize(): MessageSegment[] {
        this.finalizeCurrentSegment();
        return this.state.segments;
    }
    
    /**
     * Get all segments created so far
     */
    public getSegments(): MessageSegment[] {
        return [...this.state.segments];
    }
    
    private createInitialState(streamId?: string): SegmentationState {
        return {
            currentSegment: null,
            segments: [],
            pendingTools: [],
            streamId: streamId || `stream_${Date.now()}`,
            lastSegmentType: undefined
        };
    }
    
    private createNewSegment(type: MessageSegment['segmentType'], initialContent: string = ''): void {
        const segment: MessageSegment = {
            id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: initialContent,
            role: 'assistant',
            segmentType: type,
            timestamp: Date.now(),
            parentMessageId: this.state.streamId
        };
        
        // Attach any pending tools to this segment
        if (this.state.pendingTools.length > 0) {
            segment.toolUses = [...this.state.pendingTools];
            this.state.pendingTools = [];
        }
        
        this.state.currentSegment = segment;
        this.state.lastSegmentType = 'text';
    }
    
    private finalizeCurrentSegment(): void {
        if (this.state.currentSegment && this.state.currentSegment.content.trim()) {
            this.state.segments.push(this.state.currentSegment);
            this.state.currentSegment = null;
        }
    }
    
    private detectBreakPoint(text: string): { type: MessageSegment['segmentType']; remainingText: string } | null {
        // Tool preface patterns
        const toolPrefacePatterns = [
            /^(Let me|I'll|I need to|First, I'll|Now I'll|Next, let me)\s+/i,
            /^(Looking at|Based on|Analyzing|Examining)\s+/i,
        ];
        
        for (const pattern of toolPrefacePatterns) {
            if (pattern.test(text.trim())) {
                return { type: 'tool-preface', remainingText: text };
            }
        }
        
        // Section headers (markdown)
        if (/^#{1,6}\s+/.test(text.trim())) {
            return { type: 'continuation', remainingText: text };
        }
        
        // Double newline followed by significant text
        if (text.startsWith('\n\n') && text.trim().length > 20) {
            return { type: 'continuation', remainingText: text.trim() };
        }
        
        return null;
    }
}