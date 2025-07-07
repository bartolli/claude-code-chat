#!/usr/bin/env python3
"""
Git checkpoint system for Claude Code
Creates logical commits during development for easy recovery
"""
import json
import sys
import subprocess
import os

# Configuration
CHECKPOINT_TRIGGERS = {
    # Tool patterns that should trigger checkpoints
    "major_changes": ["Write", "MultiEdit"],
    "test_completion": ["Bash.*test", "Bash.*npm.*test"],
    "feature_completion": ["Edit.*COMPLETED", "Write.*COMPLETED"]
}

def get_git_status():
    """Check if there are uncommitted changes"""
    try:
        result = subprocess.run(['git', 'status', '--porcelain'], 
                              capture_output=True, text=True)
        return len(result.stdout.strip()) > 0
    except:
        return False

def get_changed_files():
    """Get list of changed files"""
    try:
        result = subprocess.run(['git', 'diff', '--name-only', 'HEAD'], 
                              capture_output=True, text=True)
        files = result.stdout.strip().split('\n')
        return [f for f in files if f]
    except:
        return []

def analyze_changes(tool_name, tool_input):
    """Analyze what was changed to create meaningful commit message"""
    changed_files = get_changed_files()
    
    # Categorize changes
    categories = {
        "migration": any("migration" in f for f in changed_files),
        "tests": any("test" in f for f in changed_files),
        "hooks": any(".claude/hooks" in f for f in changed_files),
        "state": any("state" in f or "StateManager" in f for f in changed_files),
        "docs": any(".md" in f for f in changed_files)
    }
    
    # Build commit type
    if categories["tests"]:
        commit_type = "test"
    elif categories["migration"]:
        commit_type = "feat(migration)"
    elif categories["hooks"]:
        commit_type = "chore(hooks)"
    elif categories["docs"]:
        commit_type = "docs"
    else:
        commit_type = "feat"
    
    # Build commit message based on tool and files
    if tool_name == "Write":
        file_path = tool_input.get("file_path", "")
        if "test" in file_path:
            message = f"Add tests for {os.path.basename(file_path)}"
        elif ".md" in file_path:
            message = f"Update documentation: {os.path.basename(file_path)}"
        else:
            message = f"Implement {os.path.basename(file_path)}"
    elif tool_name == "Edit" or tool_name == "MultiEdit":
        if len(changed_files) == 1:
            message = f"Update {os.path.basename(changed_files[0])}"
        else:
            message = f"Update {len(changed_files)} files"
    else:
        message = "Update codebase"
    
    return f"{commit_type}: {message}"

def should_create_checkpoint(tool_name, tool_response):
    """Determine if a checkpoint should be created"""
    # Check if there are changes
    if not get_git_status():
        return False
    
    # Check tool response for success
    if isinstance(tool_response, dict):
        if not tool_response.get("success", True):
            return False
    
    # Check triggers
    for trigger_type, patterns in CHECKPOINT_TRIGGERS.items():
        for pattern in patterns:
            if pattern in tool_name:
                return True
    
    # Check for completion markers in changed files
    changed_files = get_changed_files()
    if any("COMPLETED" in f or "✅" in f for f in changed_files):
        return True
    
    return False

def create_checkpoint(message, checkpoint_type="auto"):
    """Create a git commit checkpoint"""
    try:
        # Stage all changes
        subprocess.run(['git', 'add', '-A'], check=True)
        
        # Create commit with checkpoint marker
        full_message = f"{message}\n\n[checkpoint: {checkpoint_type}]\n🤖 Claude Code Checkpoint"
        subprocess.run(['git', 'commit', '-m', full_message], check=True)
        
        # Get commit hash
        result = subprocess.run(['git', 'rev-parse', 'HEAD'], 
                              capture_output=True, text=True)
        commit_hash = result.stdout.strip()[:8]
        
        return True, commit_hash
    except subprocess.CalledProcessError as e:
        return False, str(e)

def main():
    try:
        # Read input
        input_data = json.load(sys.stdin)
        tool_name = input_data.get("tool_name", "")
        tool_input = input_data.get("tool_input", {})
        tool_response = input_data.get("tool_response", {})
        
        # Check if checkpoint is needed
        if not should_create_checkpoint(tool_name, tool_response):
            sys.exit(0)
        
        # Analyze changes and create message
        commit_message = analyze_changes(tool_name, tool_input)
        
        # Create checkpoint
        success, result = create_checkpoint(commit_message)
        
        if success:
            print(f"✅ Checkpoint created: {result} - {commit_message}")
        else:
            print(f"⚠️  Checkpoint skipped: {result}", file=sys.stderr)
        
    except Exception as e:
        # Don't block on errors
        print(f"Checkpoint error: {e}", file=sys.stderr)
    
    # Always exit successfully to not block workflow
    sys.exit(0)

if __name__ == "__main__":
    main()