#!/usr/bin/env bash
# single-file-quality-check.sh - Single file quality checks for Claude Code
#
# A focused quality check that runs on the specific file that was just modified.
# Triggered by PostToolUse events for Write, Edit, and MultiEdit operations.
#
# EXIT CODES:
#   0 - Success (all checks passed)
#   1 - General error (missing dependencies, etc.)
#   2 - Quality issues found - ALL must be fixed (blocking)

set +e  # Don't exit on error, we control exit codes

# ============================================================================
# CONFIGURATION
# ============================================================================

# Source project-specific configuration if it exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/.claude-hooks-config.sh"

if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
fi

# Default values if not set by config
: ${CLAUDE_HOOKS_TYPESCRIPT_ENABLED:=true}
: ${CLAUDE_HOOKS_ESLINT_ENABLED:=true}
: ${CLAUDE_HOOKS_PRETTIER_ENABLED:=true}
: ${CLAUDE_HOOKS_MIGRATION_SAFETY_ENABLED:=true}
: ${CLAUDE_HOOKS_TEST_RUNNER_ENABLED:=false}
: ${CLAUDE_HOOKS_TEST_COMMAND:="npm test"}
: ${CLAUDE_HOOKS_PRETTIER_AUTOFIX:=false}
: ${CLAUDE_HOOKS_ESLINT_AUTOFIX:=false}
: ${CLAUDE_HOOKS_AUTOFIX_SILENT:=false}
: ${CLAUDE_HOOKS_MIGRATION_TESTS_ENABLED:=false}
: ${CLAUDE_HOOKS_MIGRATION_TEST_COMMAND:="npm run test -- --grep migration"}
: ${CLAUDE_HOOKS_MIGRATION_CRITICAL_PATTERNS:="migration/|StateManager|ExtensionMessageHandler|state/slices/"}
: ${CLAUDE_HOOKS_MIGRATION_MESSAGE:="Remember: We're migrating from SimpleStateManager to Redux. Always use feature flags!"}

# Debug mode for troubleshooting
: ${CLAUDE_HOOKS_DEBUG:=false}

# ============================================================================
# COLOR DEFINITIONS
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $*" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

log_debug() {
    if [[ "$CLAUDE_HOOKS_DEBUG" == "true" ]]; then
        echo -e "${CYAN}[DEBUG]${NC} $*" >&2
    fi
}

# ============================================================================
# ERROR TRACKING
# ============================================================================

declare -a ERROR_SUMMARY=()
declare -i ERROR_COUNT=0
declare -a AUTOFIX_SUMMARY=()
declare -i AUTOFIX_COUNT=0

add_error() {
    local message="$1"
    ERROR_COUNT+=1
    ERROR_SUMMARY+=("${RED}❌${NC} $message")
}

add_autofix() {
    local message="$1"
    AUTOFIX_COUNT+=1
    AUTOFIX_SUMMARY+=("${GREEN}✨${NC} $message")
}

print_summary() {
    # Show auto-fixes if any
    if [[ $AUTOFIX_COUNT -gt 0 ]]; then
        echo -e "\n${BLUE}═══ Auto-fixes Applied ═══${NC}" >&2
        for item in "${AUTOFIX_SUMMARY[@]}"; do
            echo -e "$item" >&2
        done
        echo -e "${GREEN}Automatically fixed $AUTOFIX_COUNT issue(s) for you!${NC}" >&2
    fi
    
    # Show errors if any
    if [[ $ERROR_COUNT -gt 0 ]]; then
        echo -e "\n${BLUE}═══ Quality Check Summary ═══${NC}" >&2
        for item in "${ERROR_SUMMARY[@]}"; do
            echo -e "$item" >&2
        done
        
        echo -e "\n${RED}Found $ERROR_COUNT issue(s) that MUST be fixed!${NC}" >&2
        echo -e "${RED}════════════════════════════════════════════${NC}" >&2
        echo -e "${RED}❌ ALL ISSUES ARE BLOCKING ❌${NC}" >&2
        echo -e "${RED}════════════════════════════════════════════${NC}" >&2
        echo -e "${RED}Fix EVERYTHING above until all checks are ✅ GREEN${NC}" >&2
    fi
}

# ============================================================================
# FILE TYPE DETECTION
# ============================================================================

detect_file_type() {
    local file_path="$1"
    
    # Test files first (most specific)
    if [[ "$file_path" =~ \.(test|spec)\.(ts|tsx|js|jsx)$ ]]; then
        echo "test"
    # Migration-critical files (ExtensionMessageHandler, StateManager)
    elif [[ "$file_path" =~ (ExtensionMessageHandler|StateManager) ]]; then
        echo "migration-critical"
    # Migration files
    elif [[ "$file_path" =~ /migration/ ]]; then
        echo "migration"
    # Redux files
    elif [[ "$file_path" =~ /store/|/slices/|/reducers/ ]]; then
        echo "redux"
    # TypeScript/JavaScript files
    elif [[ "$file_path" =~ \.(ts|tsx)$ ]]; then
        echo "typescript"
    elif [[ "$file_path" =~ \.(js|jsx)$ ]]; then
        echo "javascript"
    else
        echo "unknown"
    fi
}

# ============================================================================
# QUALITY CHECKS
# ============================================================================

check_typescript_compilation() {
    if [[ "$CLAUDE_HOOKS_TYPESCRIPT_ENABLED" != "true" ]]; then
        return 0
    fi
    
    if [[ ! -f "tsconfig.json" ]]; then
        return 0
    fi
    
    log_info "Running TypeScript compilation check..."
    
    local tsc_output
    if ! tsc_output=$(npx tsc --noEmit 2>&1); then
        add_error "TypeScript compilation errors found"
        echo "$tsc_output" >&2
        return 1
    else
        log_success "TypeScript compilation passed"
        return 0
    fi
}

check_eslint() {
    local file_path="$1"
    
    if [[ "$CLAUDE_HOOKS_ESLINT_ENABLED" != "true" ]]; then
        return 0
    fi
    
    if [[ ! -f "package.json" ]] || ! grep -q "eslint" package.json 2>/dev/null; then
        return 0
    fi
    
    log_info "Running ESLint..."
    
    local eslint_output
    if ! eslint_output=$(npx eslint "$file_path" 2>&1); then
        if [[ "$CLAUDE_HOOKS_ESLINT_AUTOFIX" == "true" ]]; then
            log_warning "ESLint issues found, attempting auto-fix..."
            if npx eslint --fix "$file_path" >/dev/null 2>&1; then
                # Check if issues remain after auto-fix
                if npx eslint "$file_path" >/dev/null 2>&1; then
                    log_success "ESLint auto-fixed all issues!"
                    if [[ "$CLAUDE_HOOKS_AUTOFIX_SILENT" == "true" ]]; then
                        add_autofix "ESLint auto-fixed formatting/style issues"
                    else
                        add_error "ESLint issues were auto-fixed - verify the changes"
                    fi
                else
                    add_error "ESLint found issues that couldn't be auto-fixed in $file_path"
                    npx eslint "$file_path" 2>&1 | head -20 >&2
                fi
            else
                add_error "ESLint auto-fix failed for $file_path"
                # Show the original ESLint errors when auto-fix fails
                echo "$eslint_output" | head -20 >&2
            fi
        else
            add_error "ESLint found issues in $file_path"
            echo "$eslint_output" | head -20 >&2
        fi
        return 1
    else
        log_success "ESLint passed"
        return 0
    fi
}

check_prettier() {
    local file_path="$1"
    
    if [[ "$CLAUDE_HOOKS_PRETTIER_ENABLED" != "true" ]]; then
        return 0
    fi
    
    if [[ ! -f ".prettierrc" ]] && [[ ! -f ".prettierrc.json" ]] && [[ ! -f "prettier.config.js" ]] && ! grep -q "prettier" package.json 2>/dev/null; then
        return 0
    fi
    
    log_info "Running Prettier check..."
    
    local prettier_output
    if ! prettier_output=$(npx prettier --check "$file_path" 2>&1); then
        if [[ "$CLAUDE_HOOKS_PRETTIER_AUTOFIX" == "true" ]]; then
            log_warning "Prettier formatting issues found, auto-fixing..."
            if npx prettier --write "$file_path" >/dev/null 2>&1; then
                log_success "Prettier auto-formatted the file!"
                if [[ "$CLAUDE_HOOKS_AUTOFIX_SILENT" == "true" ]]; then
                    add_autofix "Prettier auto-formatted the file"
                else
                    add_error "Prettier formatting was auto-fixed - verify the changes"
                fi
            else
                add_error "Prettier auto-fix failed for $file_path"
                echo "$prettier_output" >&2
            fi
        else
            add_error "Prettier formatting issues in $file_path"
            echo "$prettier_output" >&2
        fi
        return 1
    else
        log_success "Prettier formatting correct"
        return 0
    fi
}

check_migration_safety() {
    local file_path="$1"
    
    if [[ "$CLAUDE_HOOKS_MIGRATION_SAFETY_ENABLED" != "true" ]]; then
        return 0
    fi
    
    # Only check if it's a migration-related file or touches state management
    if [[ ! "$file_path" =~ (StateManager|state-manager|migration|webview) ]]; then
        return 0
    fi
    
    log_info "Running migration safety checks..."
    
    # Check for direct StateManager usage without feature flags
    local violations=$(grep -n "SimpleStateManager\|StateManager" "$file_path" 2>/dev/null | \
        grep -v "USE_REDUX_STATE\|featureFlags" | \
        grep -v "^[[:space:]]*\*" | \
        grep -v "^[[:space:]]*\/\/" | \
        grep -v "^[[:space:]]*\/\*" | \
        grep -v "@todo\|@deprecated\|@see" || true)
    
    if [[ -n "$violations" ]]; then
        add_error "Found direct StateManager usage without feature flag protection in $file_path"
        echo "$violations" >&2
        if [[ -n "$CLAUDE_HOOKS_MIGRATION_MESSAGE" ]]; then
            log_warning "$CLAUDE_HOOKS_MIGRATION_MESSAGE"
        fi
        return 1
    fi
    
    log_success "Migration safety checks passed"
    return 0
}

check_common_issues() {
    local file_path="$1"
    local file_type="$2"
    local found_issues=false
    
    log_info "Checking for common issues..."
    
    # Check for 'as any' in TypeScript files
    if [[ "$file_type" == "typescript" ]] && grep -n "as any" "$file_path" 2>/dev/null; then
        add_error "Found 'as any' usage in $file_path - use proper types instead!"
        found_issues=true
    fi
    
    # Check for console statements (except in test files and .claude/utils)
    if [[ "$file_type" != "test" ]] && [[ ! "$file_path" =~ \.claude/utils/ ]] && grep -n "console\." "$file_path" 2>/dev/null; then
        add_error "Found console statements in $file_path - use proper logging!"
        found_issues=true
    fi
    
    # Check for TODO/FIXME comments
    if grep -n "TODO\|FIXME" "$file_path" 2>/dev/null; then
        log_warning "Found TODO/FIXME comments in $file_path"
    fi
    
    if [[ "$found_issues" == "false" ]]; then
        log_success "No common issues found"
    fi
    
    return 0
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

# ============================================================================
# ROBUST JSON PARSING
# ============================================================================

parse_json_input() {
    local input_json="$1"
    local file_path=""
    local tool_name=""
    
    log_debug "Parsing JSON input: $input_json"
    
    # Extract tool name and file path using multiple approaches
    tool_name=$(echo "$input_json" | grep -o '"tool_name"[^,}]*' | sed 's/.*"tool_name"[^"]*"\([^"]*\)".*/\1/' 2>/dev/null || true)
    
    # Try multiple field names for file path
    file_path=$(echo "$input_json" | grep -o '"file_path"[^,}]*' | sed 's/.*"file_path"[^"]*"\([^"]*\)".*/\1/' 2>/dev/null || true)
    
    if [[ -z "$file_path" ]]; then
        file_path=$(echo "$input_json" | grep -o '"path"[^,}]*' | sed 's/.*"path"[^"]*"\([^"]*\)".*/\1/' 2>/dev/null || true)
    fi
    
    if [[ -z "$file_path" ]]; then
        file_path=$(echo "$input_json" | grep -o '"notebook_path"[^,}]*' | sed 's/.*"notebook_path"[^"]*"\([^"]*\)".*/\1/' 2>/dev/null || true)
    fi
    
    log_debug "Extracted tool_name: $tool_name"
    log_debug "Extracted file_path: $file_path"
    
    echo "$file_path"
}

should_check_file() {
    local file_path="$1"
    
    # Check if file exists
    if [[ ! -f "$file_path" ]]; then
        log_debug "File does not exist: $file_path"
        return 1
    fi
    
    # Check if it's a source file
    if [[ ! "$file_path" =~ \.(ts|tsx|js|jsx)$ ]]; then
        log_debug "Not a source file: $file_path"
        return 1
    fi
    
    return 0
}

main() {
    # Always show header first to indicate hook is running
    echo "" >&2
    echo "🔍 Single File Quality Check - Starting..." >&2
    echo "────────────────────────────────────────────" >&2
    
    # Read JSON input from stdin
    local input_json=""
    if [[ -t 0 ]]; then
        # No stdin available (testing or manual execution)
        log_warning "No JSON input provided. This hook expects JSON input from Claude Code."
        log_info "For testing, provide JSON like: echo '{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"/path/to/file.ts\"}}' | $0"
        echo -e "\n${YELLOW}👉 Hook executed but no input to process.${NC}" >&2
        exit 0
    else
        input_json=$(cat)
        log_debug "Received JSON input: $input_json"
    fi
    
    # Parse file path from tool input
    local file_path=$(parse_json_input "$input_json")
    
    if [[ -z "$file_path" ]]; then
        log_warning "No file path found in JSON input. Tool might not be file-related."
        log_debug "JSON input was: $input_json"
        echo -e "\n${YELLOW}👉 No file to check - tool may not be file-related.${NC}" >&2
        exit 0
    fi
    
    # Check if we should process this file
    if ! should_check_file "$file_path"; then
        if [[ ! -f "$file_path" ]]; then
            log_info "File does not exist: $file_path (may have been deleted)"
        else
            log_info "Skipping non-source file: $file_path"
        fi
        echo -e "\n${YELLOW}👉 File skipped - not a source file or doesn't exist.${NC}" >&2
        exit 0
    fi
    
    # Update header with file name
    echo "" >&2
    echo "🔍 Single File Quality Check - Validating: $(basename "$file_path")" >&2
    echo "────────────────────────────────────────────" >&2
    
    log_info "Checking: $file_path"
    
    # Detect file type
    local file_type=$(detect_file_type "$file_path")
    
    # Run TypeScript compilation check (project-wide)
    if [[ "$CLAUDE_HOOKS_TYPESCRIPT_ENABLED" == "true" ]]; then
        check_typescript_compilation
    fi
    
    # Run file-specific checks
    case "$file_type" in
        "typescript"|"javascript"|"test")
            check_eslint "$file_path"
            check_prettier "$file_path"
            check_common_issues "$file_path" "$file_type"
            ;;
        "migration")
            check_eslint "$file_path"
            check_prettier "$file_path"
            check_migration_safety "$file_path"
            check_common_issues "$file_path" "$file_type"
            ;;
        "migration-critical")
            check_eslint "$file_path"
            check_prettier "$file_path"
            check_migration_safety "$file_path"
            check_common_issues "$file_path" "$file_type"
            ;;
        "redux")
            check_eslint "$file_path"
            check_prettier "$file_path"
            check_common_issues "$file_path" "$file_type"
            ;;
    esac
    
    # Print summary
    print_summary
    
    # Return appropriate exit code
    if [[ $ERROR_COUNT -gt 0 ]]; then
        echo -e "\n${RED}🛑 FAILED - Fix all issues above! 🛑${NC}" >&2
        echo -e "${YELLOW}📋 NEXT STEPS:${NC}" >&2
        echo -e "${YELLOW}  1. Fix the issues listed above${NC}" >&2
        echo -e "${YELLOW}  2. The hook will run again automatically${NC}" >&2
        echo -e "${YELLOW}  3. Continue with your original task once all checks pass${NC}" >&2
        exit 2
    else
        echo -e "\n${GREEN}✅ Quality check passed for $(basename "$file_path")${NC}"
        
        # Show auto-fix summary if in silent mode
        if [[ $AUTOFIX_COUNT -gt 0 ]] && [[ "$CLAUDE_HOOKS_AUTOFIX_SILENT" == "true" ]]; then
            echo -e "\n${YELLOW}👉 File quality verified. Auto-fixes applied. Continue with your task.${NC}"
        else
            echo -e "\n${YELLOW}👉 File quality verified. Continue with your task.${NC}"
        fi
        exit 0
    fi
}

# Run main function
main "$@"