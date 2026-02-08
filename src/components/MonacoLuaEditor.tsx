import { useRef, useEffect } from "react";
import Editor, { Monaco, OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

// Roblox/Executor Lua Completions
const ROBLOX_GLOBALS = [
  // Core
  { label: "game", kind: "Variable", detail: "DataModel", insertText: "game" },
  { label: "workspace", kind: "Variable", detail: "Workspace", insertText: "workspace" },
  { label: "script", kind: "Variable", detail: "LuaSourceContainer", insertText: "script" },
  { label: "Players", kind: "Variable", detail: "Players service", insertText: "game:GetService(\"Players\")" },
  { label: "ReplicatedStorage", kind: "Variable", detail: "ReplicatedStorage service", insertText: "game:GetService(\"ReplicatedStorage\")" },
  { label: "ServerStorage", kind: "Variable", detail: "ServerStorage service", insertText: "game:GetService(\"ServerStorage\")" },
  { label: "Lighting", kind: "Variable", detail: "Lighting service", insertText: "game:GetService(\"Lighting\")" },
  { label: "TweenService", kind: "Variable", detail: "TweenService", insertText: "game:GetService(\"TweenService\")" },
  { label: "RunService", kind: "Variable", detail: "RunService", insertText: "game:GetService(\"RunService\")" },
  { label: "UserInputService", kind: "Variable", detail: "UserInputService", insertText: "game:GetService(\"UserInputService\")" },
  { label: "HttpService", kind: "Variable", detail: "HttpService", insertText: "game:GetService(\"HttpService\")" },
  { label: "MarketplaceService", kind: "Variable", detail: "MarketplaceService", insertText: "game:GetService(\"MarketplaceService\")" },
  { label: "DataStoreService", kind: "Variable", detail: "DataStoreService", insertText: "game:GetService(\"DataStoreService\")" },
  { label: "Debris", kind: "Variable", detail: "Debris service", insertText: "game:GetService(\"Debris\")" },
  { label: "StarterGui", kind: "Variable", detail: "StarterGui service", insertText: "game:GetService(\"StarterGui\")" },
  { label: "CoreGui", kind: "Variable", detail: "CoreGui service", insertText: "game:GetService(\"CoreGui\")" },
  
  // Functions
  { label: "print", kind: "Function", detail: "Print to output", insertText: "print($1)", insertTextRules: 4 },
  { label: "warn", kind: "Function", detail: "Print warning", insertText: "warn($1)", insertTextRules: 4 },
  { label: "error", kind: "Function", detail: "Throw error", insertText: "error($1)", insertTextRules: 4 },
  { label: "wait", kind: "Function", detail: "Wait seconds", insertText: "wait($1)", insertTextRules: 4 },
  { label: "task.wait", kind: "Function", detail: "Task wait", insertText: "task.wait($1)", insertTextRules: 4 },
  { label: "task.spawn", kind: "Function", detail: "Task spawn", insertText: "task.spawn(function()\n\t$1\nend)", insertTextRules: 4 },
  { label: "task.defer", kind: "Function", detail: "Task defer", insertText: "task.defer(function()\n\t$1\nend)", insertTextRules: 4 },
  { label: "spawn", kind: "Function", detail: "Spawn coroutine", insertText: "spawn(function()\n\t$1\nend)", insertTextRules: 4 },
  { label: "delay", kind: "Function", detail: "Delayed spawn", insertText: "delay($1, function()\n\t$2\nend)", insertTextRules: 4 },
  { label: "pcall", kind: "Function", detail: "Protected call", insertText: "pcall(function()\n\t$1\nend)", insertTextRules: 4 },
  { label: "xpcall", kind: "Function", detail: "Extended pcall", insertText: "xpcall(function()\n\t$1\nend, function(err)\n\twarn(err)\nend)", insertTextRules: 4 },
  { label: "typeof", kind: "Function", detail: "Get type", insertText: "typeof($1)", insertTextRules: 4 },
  { label: "tostring", kind: "Function", detail: "To string", insertText: "tostring($1)", insertTextRules: 4 },
  { label: "tonumber", kind: "Function", detail: "To number", insertText: "tonumber($1)", insertTextRules: 4 },
  { label: "Instance.new", kind: "Function", detail: "Create instance", insertText: "Instance.new(\"$1\")", insertTextRules: 4 },
  { label: "loadstring", kind: "Function", detail: "Load string as code", insertText: "loadstring($1)()", insertTextRules: 4 },
  
  // Executor Functions
  { label: "getgenv", kind: "Function", detail: "Get global env", insertText: "getgenv()" },
  { label: "getrenv", kind: "Function", detail: "Get Roblox env", insertText: "getrenv()" },
  { label: "getfenv", kind: "Function", detail: "Get function env", insertText: "getfenv($1)", insertTextRules: 4 },
  { label: "setfenv", kind: "Function", detail: "Set function env", insertText: "setfenv($1, $2)", insertTextRules: 4 },
  { label: "hookfunction", kind: "Function", detail: "Hook function", insertText: "hookfunction($1, function(...)\n\t$2\nend)", insertTextRules: 4 },
  { label: "hookmetamethod", kind: "Function", detail: "Hook metamethod", insertText: "hookmetamethod(game, \"$1\", function(...)\n\t$2\nend)", insertTextRules: 4 },
  { label: "getrawmetatable", kind: "Function", detail: "Get raw metatable", insertText: "getrawmetatable($1)", insertTextRules: 4 },
  { label: "setrawmetatable", kind: "Function", detail: "Set raw metatable", insertText: "setrawmetatable($1, $2)", insertTextRules: 4 },
  { label: "setreadonly", kind: "Function", detail: "Set readonly", insertText: "setreadonly($1, $2)", insertTextRules: 4 },
  { label: "isreadonly", kind: "Function", detail: "Check readonly", insertText: "isreadonly($1)", insertTextRules: 4 },
  { label: "checkcaller", kind: "Function", detail: "Check if executor", insertText: "checkcaller()" },
  { label: "getcallingscript", kind: "Function", detail: "Get calling script", insertText: "getcallingscript()" },
  { label: "getscriptbytecode", kind: "Function", detail: "Get bytecode", insertText: "getscriptbytecode($1)", insertTextRules: 4 },
  { label: "decompile", kind: "Function", detail: "Decompile script", insertText: "decompile($1)", insertTextRules: 4 },
  { label: "getsenv", kind: "Function", detail: "Get script env", insertText: "getsenv($1)", insertTextRules: 4 },
  { label: "getconnections", kind: "Function", detail: "Get connections", insertText: "getconnections($1)", insertTextRules: 4 },
  { label: "firesignal", kind: "Function", detail: "Fire signal", insertText: "firesignal($1)", insertTextRules: 4 },
  { label: "fireclickdetector", kind: "Function", detail: "Fire click detector", insertText: "fireclickdetector($1)", insertTextRules: 4 },
  { label: "firetouchinterest", kind: "Function", detail: "Fire touch interest", insertText: "firetouchinterest($1, $2, $3)", insertTextRules: 4 },
  { label: "fireproximityprompt", kind: "Function", detail: "Fire proximity prompt", insertText: "fireproximityprompt($1)", insertTextRules: 4 },
  { label: "getinstances", kind: "Function", detail: "Get all instances", insertText: "getinstances()" },
  { label: "getnilinstances", kind: "Function", detail: "Get nil parented", insertText: "getnilinstances()" },
  { label: "getgc", kind: "Function", detail: "Get garbage collector", insertText: "getgc()" },
  { label: "getupvalues", kind: "Function", detail: "Get upvalues", insertText: "getupvalues($1)", insertTextRules: 4 },
  { label: "setupvalue", kind: "Function", detail: "Set upvalue", insertText: "setupvalue($1, $2, $3)", insertTextRules: 4 },
  { label: "getconstants", kind: "Function", detail: "Get constants", insertText: "getconstants($1)", insertTextRules: 4 },
  { label: "setconstant", kind: "Function", detail: "Set constant", insertText: "setconstant($1, $2, $3)", insertTextRules: 4 },
  { label: "getinfo", kind: "Function", detail: "Get debug info", insertText: "getinfo($1)", insertTextRules: 4 },
  { label: "newcclosure", kind: "Function", detail: "Create C closure", insertText: "newcclosure(function(...)\n\t$1\nend)", insertTextRules: 4 },
  { label: "islclosure", kind: "Function", detail: "Is Lua closure", insertText: "islclosure($1)", insertTextRules: 4 },
  { label: "iscclosure", kind: "Function", detail: "Is C closure", insertText: "iscclosure($1)", insertTextRules: 4 },
  { label: "setclipboard", kind: "Function", detail: "Set clipboard", insertText: "setclipboard($1)", insertTextRules: 4 },
  { label: "getnamecallmethod", kind: "Function", detail: "Get namecall method", insertText: "getnamecallmethod()" },
  { label: "setnamecallmethod", kind: "Function", detail: "Set namecall method", insertText: "setnamecallmethod($1)", insertTextRules: 4 },
  { label: "request", kind: "Function", detail: "HTTP request", insertText: "request({\n\tUrl = \"$1\",\n\tMethod = \"GET\"\n})", insertTextRules: 4 },
  { label: "http_request", kind: "Function", detail: "HTTP request (alt)", insertText: "http_request({\n\tUrl = \"$1\",\n\tMethod = \"GET\"\n})", insertTextRules: 4 },
  { label: "syn.request", kind: "Function", detail: "Synapse request", insertText: "syn.request({\n\tUrl = \"$1\",\n\tMethod = \"GET\"\n})", insertTextRules: 4 },
  
  // Drawing
  { label: "Drawing.new", kind: "Function", detail: "Create drawing", insertText: "Drawing.new(\"$1\")", insertTextRules: 4 },
  
  // Common Patterns
  { label: "LocalPlayer", kind: "Variable", detail: "Local player", insertText: "game:GetService(\"Players\").LocalPlayer" },
  { label: "Character", kind: "Variable", detail: "Player character", insertText: "game:GetService(\"Players\").LocalPlayer.Character" },
  { label: "Humanoid", kind: "Variable", detail: "Player humanoid", insertText: "game:GetService(\"Players\").LocalPlayer.Character:FindFirstChild(\"Humanoid\")" },
  { label: "HumanoidRootPart", kind: "Variable", detail: "Player HRP", insertText: "game:GetService(\"Players\").LocalPlayer.Character:FindFirstChild(\"HumanoidRootPart\")" },
  { label: "Mouse", kind: "Variable", detail: "Player mouse", insertText: "game:GetService(\"Players\").LocalPlayer:GetMouse()" },
  { label: "Camera", kind: "Variable", detail: "Current camera", insertText: "workspace.CurrentCamera" },
];

// Lua Keywords
const LUA_KEYWORDS = [
  "and", "break", "do", "else", "elseif", "end", "false", "for", 
  "function", "if", "in", "local", "nil", "not", "or", "repeat", 
  "return", "then", "true", "until", "while", "continue"
];

// Snippets
const LUA_SNIPPETS = [
  {
    label: "for loop",
    kind: "Snippet",
    detail: "For loop",
    insertText: "for ${1:i} = ${2:1}, ${3:10} do\n\t$0\nend",
    insertTextRules: 4
  },
  {
    label: "for pairs",
    kind: "Snippet",
    detail: "For pairs loop",
    insertText: "for ${1:key}, ${2:value} in pairs(${3:table}) do\n\t$0\nend",
    insertTextRules: 4
  },
  {
    label: "for ipairs",
    kind: "Snippet",
    detail: "For ipairs loop",
    insertText: "for ${1:index}, ${2:value} in ipairs(${3:array}) do\n\t$0\nend",
    insertTextRules: 4
  },
  {
    label: "function",
    kind: "Snippet",
    detail: "Function definition",
    insertText: "function ${1:name}(${2:args})\n\t$0\nend",
    insertTextRules: 4
  },
  {
    label: "local function",
    kind: "Snippet",
    detail: "Local function",
    insertText: "local function ${1:name}(${2:args})\n\t$0\nend",
    insertTextRules: 4
  },
  {
    label: "if",
    kind: "Snippet",
    detail: "If statement",
    insertText: "if ${1:condition} then\n\t$0\nend",
    insertTextRules: 4
  },
  {
    label: "if else",
    kind: "Snippet",
    detail: "If else statement",
    insertText: "if ${1:condition} then\n\t$2\nelse\n\t$0\nend",
    insertTextRules: 4
  },
  {
    label: "while",
    kind: "Snippet",
    detail: "While loop",
    insertText: "while ${1:condition} do\n\t$0\nend",
    insertTextRules: 4
  },
  {
    label: "repeat",
    kind: "Snippet",
    detail: "Repeat until",
    insertText: "repeat\n\t$0\nuntil ${1:condition}",
    insertTextRules: 4
  },
  {
    label: "tween",
    kind: "Snippet",
    detail: "TweenService tween",
    insertText: "local TweenService = game:GetService(\"TweenService\")\nlocal tween = TweenService:Create(${1:instance}, TweenInfo.new(${2:1}), {\n\t${3:Property} = ${4:Value}\n})\ntween:Play()",
    insertTextRules: 4
  },
  {
    label: "connection",
    kind: "Snippet",
    detail: "Event connection",
    insertText: "${1:instance}.${2:Event}:Connect(function(${3:args})\n\t$0\nend)",
    insertTextRules: 4
  },
  {
    label: "remote",
    kind: "Snippet",
    detail: "Remote event",
    insertText: "local remote = game:GetService(\"ReplicatedStorage\"):WaitForChild(\"${1:RemoteName}\")\nremote:FireServer(${2:args})",
    insertTextRules: 4
  },
  {
    label: "gui",
    kind: "Snippet",
    detail: "Create ScreenGui",
    insertText: "local ScreenGui = Instance.new(\"ScreenGui\")\nScreenGui.Name = \"${1:MyGui}\"\nScreenGui.Parent = game:GetService(\"CoreGui\")\n\nlocal Frame = Instance.new(\"Frame\")\nFrame.Size = UDim2.new(0, ${2:200}, 0, ${3:150})\nFrame.Position = UDim2.new(0.5, -${2:200}/2, 0.5, -${3:150}/2)\nFrame.BackgroundColor3 = Color3.fromRGB(${4:30}, ${5:30}, ${6:30})\nFrame.Parent = ScreenGui\n$0",
    insertTextRules: 4
  },
];

// ShadowAuth Theme Definition
const SHADOWAUTH_THEME = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [
    { token: "", foreground: "E4E4E7", background: "0A0A0B" },
    { token: "comment", foreground: "6B7280", fontStyle: "italic" },
    { token: "keyword", foreground: "C084FC" },
    { token: "keyword.control", foreground: "C084FC" },
    { token: "string", foreground: "86EFAC" },
    { token: "string.escape", foreground: "FDE047" },
    { token: "number", foreground: "67E8F9" },
    { token: "operator", foreground: "F472B6" },
    { token: "delimiter", foreground: "A1A1AA" },
    { token: "delimiter.bracket", foreground: "A1A1AA" },
    { token: "delimiter.parenthesis", foreground: "A1A1AA" },
    { token: "variable", foreground: "E4E4E7" },
    { token: "variable.parameter", foreground: "FDA4AF" },
    { token: "function", foreground: "60A5FA" },
    { token: "type", foreground: "FBBF24" },
    { token: "constant", foreground: "F97316" },
    { token: "tag", foreground: "C084FC" },
    { token: "attribute.name", foreground: "67E8F9" },
    { token: "attribute.value", foreground: "86EFAC" },
    { token: "identifier", foreground: "E4E4E7" },
    { token: "global", foreground: "F472B6", fontStyle: "bold" },
  ],
  colors: {
    "editor.background": "#00000000",
    "editor.foreground": "#E4E4E7",
    "editor.lineHighlightBackground": "#ffffff08",
    "editor.lineHighlightBorder": "#ffffff10",
    "editorLineNumber.foreground": "#52525B",
    "editorLineNumber.activeForeground": "#A1A1AA",
    "editor.selectionBackground": "#7C3AED40",
    "editor.selectionHighlightBackground": "#7C3AED20",
    "editor.wordHighlightBackground": "#7C3AED30",
    "editorCursor.foreground": "#22D3EE",
    "editorWhitespace.foreground": "#27272A",
    "editorIndentGuide.background": "#ffffff10",
    "editorIndentGuide.activeBackground": "#ffffff20",
    "editorBracketMatch.background": "#7C3AED30",
    "editorBracketMatch.border": "#C084FC",
    "editorGutter.background": "#00000000",
    "scrollbar.shadow": "#00000000",
    "scrollbarSlider.background": "#52525B40",
    "scrollbarSlider.hoverBackground": "#71717A60",
    "scrollbarSlider.activeBackground": "#A1A1AA80",
    "minimap.background": "#00000000",
    "minimapSlider.background": "#52525B40",
    "editor.findMatchBackground": "#C084FC40",
    "editor.findMatchHighlightBackground": "#7C3AED30",
    "editorOverviewRuler.border": "#00000000",
    "editorHoverWidget.background": "#18181B",
    "editorHoverWidget.border": "#27272A",
    "editorSuggestWidget.background": "#18181B",
    "editorSuggestWidget.border": "#27272A",
    "editorSuggestWidget.foreground": "#E4E4E7",
    "editorSuggestWidget.selectedBackground": "#7C3AED40",
    "editorSuggestWidget.highlightForeground": "#C084FC",
    "editorWidget.background": "#18181B",
    "editorWidget.border": "#27272A",
    "input.background": "#18181B",
    "input.border": "#27272A",
    "input.foreground": "#E4E4E7",
    "focusBorder": "#7C3AED",
  },
};

interface MonacoLuaEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
  minimap?: boolean;
  className?: string;
}

export default function MonacoLuaEditor({
  value,
  onChange,
  height = "100%",
  readOnly = false,
  minimap = true,
  className = "",
}: MonacoLuaEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const handleEditorWillMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    
    // Define ShadowAuth theme
    monaco.editor.defineTheme("shadowauth", SHADOWAUTH_THEME);

    // Register Lua language if not exists
    if (!monaco.languages.getLanguages().find(l => l.id === "lua")) {
      monaco.languages.register({ id: "lua" });
    }

    // Set Lua language configuration
    monaco.languages.setLanguageConfiguration("lua", {
      comments: {
        lineComment: "--",
        blockComment: ["--[[", "]]"],
      },
      brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: "[[", close: "]]" },
      ],
      surroundingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
      indentationRules: {
        increaseIndentPattern: /^.*\b(then|do|else|elseif|function|repeat)\b.*$|.*\{[^}]*$/,
        decreaseIndentPattern: /^\s*(end|else|elseif|until)\b.*$|^\s*\}/,
      },
      folding: {
        markers: {
          start: /^\s*--\s*#?region\b/,
          end: /^\s*--\s*#?endregion\b/,
        },
      },
    });

    // Set Lua monarch tokenizer
    monaco.languages.setMonarchTokensProvider("lua", {
      defaultToken: "",
      tokenPostfix: ".lua",

      keywords: LUA_KEYWORDS,

      globals: [
        "game", "workspace", "script", "print", "warn", "error", "wait",
        "spawn", "delay", "pcall", "xpcall", "typeof", "type", "tostring",
        "tonumber", "pairs", "ipairs", "next", "select", "unpack", "rawget",
        "rawset", "rawequal", "setmetatable", "getmetatable", "assert",
        "loadstring", "coroutine", "string", "table", "math", "os", "debug",
        "Instance", "Vector3", "Vector2", "CFrame", "Color3", "BrickColor",
        "UDim", "UDim2", "Rect", "Ray", "Region3", "TweenInfo", "Enum",
        "task", "Drawing", "getgenv", "getrenv", "getfenv", "setfenv",
        "hookfunction", "hookmetamethod", "getrawmetatable", "setrawmetatable",
        "checkcaller", "newcclosure", "getconnections", "firesignal",
        "fireclickdetector", "firetouchinterest", "fireproximityprompt",
        "getinstances", "getnilinstances", "getgc", "syn", "request",
        "http_request", "setclipboard", "decompile", "getsenv"
      ],

      brackets: [
        { open: "{", close: "}", token: "delimiter.bracket" },
        { open: "[", close: "]", token: "delimiter.bracket" },
        { open: "(", close: ")", token: "delimiter.parenthesis" },
      ],

      operators: [
        "+", "-", "*", "/", "%", "^", "#",
        "==", "~=", "<", ">", "<=", ">=",
        "=", "and", "or", "not", "..", "..."
      ],

      tokenizer: {
        root: [
          // Comments
          [/--\[\[/, "comment", "@comment"],
          [/--.*$/, "comment"],

          // Strings
          [/\[\[/, "string", "@string_long"],
          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/'([^'\\]|\\.)*$/, "string.invalid"],
          [/"/, "string", "@string_double"],
          [/'/, "string", "@string_single"],

          // Numbers
          [/0[xX][0-9a-fA-F]+/, "number.hex"],
          [/\d+(\.\d+)?([eE][+-]?\d+)?/, "number"],

          // Keywords & Identifiers
          [/[a-zA-Z_]\w*/, {
            cases: {
              "@keywords": "keyword",
              "@globals": "global",
              "@default": "identifier",
            },
          }],

          // Operators
          [/[+\-*/%^#]/, "operator"],
          [/[=~<>]=?/, "operator"],
          [/\.\.\.?/, "operator"],

          // Delimiters
          [/[{}()\[\]]/, "@brackets"],
          [/[;,.]/, "delimiter"],
        ],

        comment: [
          [/\]\]/, "comment", "@pop"],
          [/./, "comment"],
        ],

        string_long: [
          [/\]\]/, "string", "@pop"],
          [/./, "string"],
        ],

        string_double: [
          [/[^\\"]+/, "string"],
          [/\\./, "string.escape"],
          [/"/, "string", "@pop"],
        ],

        string_single: [
          [/[^\\']+/, "string"],
          [/\\./, "string.escape"],
          [/'/, "string", "@pop"],
        ],
      },
    });

    // Register completion provider
    monaco.languages.registerCompletionItemProvider("lua", {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: any[] = [];

        // Add keywords
        LUA_KEYWORDS.forEach(kw => {
          suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range,
          });
        });

        // Add Roblox globals
        ROBLOX_GLOBALS.forEach(item => {
          suggestions.push({
            label: item.label,
            kind: item.kind === "Function" 
              ? monaco.languages.CompletionItemKind.Function 
              : monaco.languages.CompletionItemKind.Variable,
            detail: item.detail,
            insertText: item.insertText,
            insertTextRules: item.insertTextRules || 0,
            range,
          });
        });

        // Add snippets
        LUA_SNIPPETS.forEach(snippet => {
          suggestions.push({
            label: snippet.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: snippet.detail,
            insertText: snippet.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          });
        });

        return { suggestions };
      },
    });

    // Register hover provider
    monaco.languages.registerHoverProvider("lua", {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const item = ROBLOX_GLOBALS.find(g => g.label === word.word);
        if (item) {
          return {
            contents: [
              { value: `**${item.label}**` },
              { value: item.detail },
            ],
          };
        }

        return null;
      },
    });
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Set theme after mount
    monaco.editor.setTheme("shadowauth");

    // Additional editor setup
    editor.updateOptions({
      fontLigatures: true,
      renderWhitespace: "selection",
      cursorStyle: "line",
      cursorWidth: 2,
    });
  };

  return (
    <div
      className={`rounded-lg overflow-hidden monaco-transparent ${className}`}
      style={{
        height: height === "100%" ? "100%" : height,
        minHeight: height === "100%" ? "300px" : undefined,
      }}
    >
      <style>{`
        .monaco-transparent .monaco-editor,
        .monaco-transparent .monaco-editor .overflow-guard,
        .monaco-transparent .monaco-editor .monaco-scrollable-element,
        .monaco-transparent .monaco-editor-background,
        .monaco-transparent .monaco-editor .inputarea.ime-input,
        .monaco-transparent .monaco-editor .margin,
        .monaco-transparent .monaco-editor .minimap {
          background: transparent !important;
          background-color: transparent !important;
        }
      `}</style>
      <Editor
        height={height}
        defaultLanguage="lua"
        language="lua"
        theme="shadowauth"
        defaultValue={value || "-- Start coding here..."}
        value={value}
        onChange={(val) => onChange(val || "")}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        loading={
          <div className="flex items-center justify-center h-full bg-transparent text-muted-foreground">
            Loading editor...
          </div>
        }
        options={{
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
          minimap: { enabled: minimap, scale: 1, showSlider: "mouseover" },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 2,
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          renderLineHighlight: "all",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          padding: { top: 16, bottom: 16 },
          bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
          guides: {
            bracketPairs: true,
            bracketPairsHorizontal: true,
            highlightActiveBracketPair: true,
            indentation: true,
            highlightActiveIndentation: true,
          },
          readOnly,
          domReadOnly: readOnly,
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true,
            showVariables: true,
            insertMode: "replace",
            filterGraceful: true,
            localityBonus: true,
            shareSuggestSelections: true,
            showIcons: true,
            preview: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          acceptSuggestionOnEnter: "on",
          tabCompletion: "on",
          parameterHints: { enabled: true },
          formatOnType: true,
          formatOnPaste: true,
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          autoSurround: "languageDefined",
          find: {
            addExtraSpaceOnTop: false,
            autoFindInSelection: "multiline",
            seedSearchStringFromSelection: "always",
          },
          folding: true,
          foldingStrategy: "indentation",
          showFoldingControls: "mouseover",
          matchBrackets: "always",
          occurrencesHighlight: "singleFile",
          selectionHighlight: true,
          links: true,
          colorDecorators: true,
          contextmenu: true,
          mouseWheelZoom: true,
          dragAndDrop: true,
          copyWithSyntaxHighlighting: true,
          cursorWidth: 2,
          renderWhitespace: "selection",
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            useShadows: false,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
        }}
      />
    </div>
  );
}
