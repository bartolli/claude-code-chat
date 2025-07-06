import typescriptEslint from "@typescript-eslint/eslint-plugin";
import jsdoc from "eslint-plugin-jsdoc";
import tsParser from "@typescript-eslint/parser";

export default [{
    files: ["**/*.ts"],
}, {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        jsdoc: jsdoc,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "@typescript-eslint/naming-convention": ["warn", {
            selector: "import",
            format: ["camelCase", "PascalCase"],
        }],

        curly: "warn",
        eqeqeq: "warn",
        "no-throw-literal": "warn",
        semi: "warn",
        
        // JSDoc rules
        "jsdoc/require-jsdoc": ["error", {
            require: {
                FunctionDeclaration: true,
                MethodDefinition: true,
                ClassDeclaration: true,
                ArrowFunctionExpression: false,
                FunctionExpression: false
            },
            contexts: [
                "TSMethodSignature",
                "TSPropertySignature"
            ]
        }],
        "jsdoc/require-description": "warn",
        "jsdoc/require-param": "error",
        "jsdoc/require-param-description": "warn",
        "jsdoc/require-returns": "error",
        "jsdoc/require-returns-description": "warn",
        "jsdoc/check-alignment": "error",
        "jsdoc/check-param-names": "error",
        "jsdoc/check-tag-names": ["error", {
            definedTags: ["todo"]
        }]
    },
}];