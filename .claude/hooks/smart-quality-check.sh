#!/usr/bin/env bash
# smart-quality-check.sh - Intelligent project-aware quality checks for Claude Code
#
# A single smart entry point that auto-detects project type and runs appropriate checks.
# Designed specifically for the claude-code-chat extension project.
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
: ${CLAUDE_HOOKS_TEST_RUNNER_ENABLED:=true}
: ${CLAUDE_HOOKS_TEST_COMMAND:="npm test"}
: ${CLAUDE_HOOKS_PRETTIER_AUTOFIX:=false}
: ${CLAUDE_HOOKS_ESLINT_AUTOFIX:=false}
: ${CLAUDE_HOOKS_AUTOFIX_SILENT:=false}
: ${CLAUDE_HOOKS_MIGRATION_TESTS_ENABLED:=false}
: ${CLAUDE_HOOKS_MIGRATION_TEST_COMMAND:="npm run test -- --grep migration"}
: ${CLAUDE_HOOKS_MIGRATION_CRITICAL_PATTERNS:="migration/|StateManager|ExtensionMessageHandler|state/slices/"}

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
# PROJECT DETECTION
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
# TYPESCRIPT CHECKS
# ============================================================================

check_typescript_compilation() {
    local file_path="$1"
    
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
    
    # Check for console statements (except in test files)
    if [[ "$file_type" != "test" ]] && grep -n "console\." "$file_path" 2>/dev/null; then
        add_error "Found console statements in $file_path - use proper logging!"
        found_issues=true
    fi
    
    # Check for TODO/FIXME comments
    if grep -n "TODO\|FIXME" "$file_path" 2>/dev/null; then
        log_warning "Found TODO/FIXME comments in $file_path"
    fi
    
    # Comment style checking is handled by ESLint with proper plugins
    
    if [[ "$found_issues" == "false" ]]; then
        log_success "No common issues found"
    fi
    
    return 0
}

# ============================================================================
# MIGRATION SAFETY CHECKS
# ============================================================================

check_migration_safety() {
    local file_path="$1"
    
    if [[ "$CLAUDE_HOOKS_MIGRATION_SAFETY_ENABLED" != "true" ]]; then
        return 0
    fi
    
    # Only check if it's a migration-related file or touches state management
    # Skip documentation files
    if [[ ! "$file_path" =~ (StateManager|state-manager|migration|webview) ]] || [[ "$file_path" =~ \.documentation\. ]]; then
        return 0
    fi
    
    log_info "Running migration safety checks..."
    
    # Check for direct StateManager usage without feature flags (excluding comments and strings)
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

# ============================================================================
# TEST RUNNER
# ============================================================================

run_related_tests() {
    local file_path="$1"
    local file_type="$2"
    
    if [[ "$CLAUDE_HOOKS_TEST_RUNNER_ENABLED" != "true" ]]; then
        return 0
    fi
    
    # Skip if not a test file or source file with tests
    if [[ "$file_type" != "test" ]] && [[ ! -f "${file_path%.ts}.test.ts" ]] && [[ ! -f "${file_path%.tsx}.test.tsx" ]]; then
        return 0
    fi
    
    log_info "Running related tests..."
    
    # Determine test command
    local test_cmd=""
    if [[ -f "package.json" ]] && grep -q '"test"' package.json; then
        if [[ "$file_type" == "test" ]]; then
            test_cmd="${CLAUDE_HOOKS_TEST_COMMAND} -- $file_path"
        else
            # Run tests for the source file
            local test_file="${file_path%.ts}.test.ts"
            [[ ! -f "$test_file" ]] && test_file="${file_path%.tsx}.test.tsx"
            [[ -f "$test_file" ]] && test_cmd="${CLAUDE_HOOKS_TEST_COMMAND} -- $test_file"
        fi
    fi
    
    if [[ -n "$test_cmd" ]]; then
        local test_output
        if ! test_output=$($test_cmd 2>&1); then
            add_error "Tests failed for $file_path"
            echo "$test_output" >&2
            return 1
        else
            log_success "Tests passed"
        fi
    fi
    
    return 0
}

# ============================================================================
# MIGRATION TEST RUNNER
# ============================================================================

run_migration_tests() {
    local file_path="$1"
    
    if [[ "$CLAUDE_HOOKS_MIGRATION_TESTS_ENABLED" != "true" ]]; then
        return 0
    fi
    
    # Check if file matches migration-critical patterns
    if [[ ! "$file_path" =~ $CLAUDE_HOOKS_MIGRATION_CRITICAL_PATTERNS ]]; then
        return 0
    fi
    
    log_info "Running migration-specific tests..."
    
    local test_files=""
    
    # Map source files to specific test files
    if [[ "$file_path" =~ ActionMapper ]]; then
        test_files="src/test/migration/actionMapper.test.ts"
        log_info "Testing ActionMapper migration..."
    elif [[ "$file_path" =~ ExtensionMessageHandler ]]; then
        test_files="src/test/migration/messageFlow.integration.test.ts"
        log_info "Testing message flow integration..."
    elif [[ "$file_path" =~ /state/slices/ ]]; then
        test_files="src/test/migration/reduxStore.integration.test.ts"
        log_info "Testing Redux store integration..."
    elif [[ "$file_path" =~ /migration/ ]]; then
        # Run all migration tests for any migration file
        test_files="src/test/migration/*.test.ts"
        log_info "Running full migration test suite..."
    fi
    
    if [[ -n "$test_files" ]]; then
        local test_output
        local test_cmd="${CLAUDE_HOOKS_MIGRATION_TEST_COMMAND} $test_files"
        
        log_info "Executing: $test_cmd"
        
        if ! test_output=$($test_cmd 2>&1); then
            add_error "Migration tests failed for $file_path"
            echo "$test_output" | tail -50 >&2
            return 1
        else
            log_success "Migration tests passed"
        fi
    fi
    
    return 0
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

# Get list of recently modified TypeScript/JavaScript files
get_modified_files() {
    local files=""
    
    # If git is available, use it to find recently modified files
    if [[ -d .git ]] && command -v git >/dev/null 2>&1; then
        # Get files modified in working directory and staging area
        files=$(git diff --name-only --diff-filter=ACM HEAD 2>/dev/null || true)
        files+=$'\n'$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)
        
        # Filter for TypeScript/JavaScript files
        files=$(echo "$files" | grep -E '\.(ts|tsx|js|jsx)$' | sort -u || true)
    fi
    
    # If no git or no modified files, check all source files (limited scope)
    if [[ -z "$files" ]]; then
        # Look for files in src directory only (avoid node_modules, dist, etc.)
        files=$(find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null | head -20 || true)
    fi
    
    echo "$files"
}

main() {
    # Print header
    echo "" >&2
    echo "🔍 Smart Quality Check - Validating code quality..." >&2
    echo "────────────────────────────────────────────" >&2
    
    # Get files to check
    local files_to_check=$(get_modified_files)
    
    if [[ -z "$files_to_check" ]]; then
        log_info "No TypeScript/JavaScript files to check"
        exit 0
    fi
    
    # Count files
    local file_count=$(echo "$files_to_check" | wc -l | tr -d ' ')
    log_info "Checking $file_count modified file(s)"
    
    # Run TypeScript compilation check once for the whole project
    if [[ "$CLAUDE_HOOKS_TYPESCRIPT_ENABLED" == "true" ]]; then
        check_typescript_compilation ""
    fi
    
    # Check each file individually for other checks
    while IFS= read -r file_path; do
        [[ -z "$file_path" ]] && continue
        
        # Skip if file doesn't exist (might have been deleted)
        [[ ! -f "$file_path" ]] && continue
        
        log_info "Checking: $file_path"
        
        # Detect file type
        local file_type=$(detect_file_type "$file_path")
        
        # Run appropriate checks based on file type
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
                run_migration_tests "$file_path"
                ;;
            "migration-critical")
                check_eslint "$file_path"
                check_prettier "$file_path"
                check_migration_safety "$file_path"
                check_common_issues "$file_path" "$file_type"
                run_migration_tests "$file_path"
                ;;
            "redux")
                check_eslint "$file_path"
                check_prettier "$file_path"
                check_common_issues "$file_path" "$file_type"
                run_migration_tests "$file_path"
                ;;
        esac
    done <<< "$files_to_check"
    
    # Run tests if any test files were modified
    if echo "$files_to_check" | grep -q '\.test\.\|\.spec\.' && [[ "$CLAUDE_HOOKS_TEST_RUNNER_ENABLED" == "true" ]]; then
        log_info "Running tests for modified test files..."
        local test_files=$(echo "$files_to_check" | grep '\.test\.\|\.spec\.' || true)
        while IFS= read -r test_file; do
            [[ -z "$test_file" ]] && continue
            run_related_tests "$test_file" "test"
        done <<< "$test_files"
    fi
    
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
        echo -e "\n${GREEN}✅ All quality checks passed${NC}" >&2
        
        # Show auto-fix summary if in silent mode
        if [[ $AUTOFIX_COUNT -gt 0 ]] && [[ "$CLAUDE_HOOKS_AUTOFIX_SILENT" == "true" ]]; then
            echo -e "\n${YELLOW}👉 Code quality verified. Auto-fixes applied. Continue with your task.${NC}" >&2
        else
            echo -e "\n${YELLOW}👉 Code quality verified. Continue with your task.${NC}" >&2
        fi
        exit 0
    fi
}

# Run main function
main