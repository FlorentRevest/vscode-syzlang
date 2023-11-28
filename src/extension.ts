import * as vscode from 'vscode';
import * as Parser from 'web-tree-sitter';
import * as path from 'path';

// This associates tree-sitter queries with tokens types.
// Standard token types are documented by VSCode here:
// https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide#standard-token-types-and-modifiers
const queries = `
(number_literal) @number
(constant) @number

(string_literal) @string
(char_literal) @string

(comment) @comment

(include) @macro
(incdir) @macro
(define
  (identifier) @macro
  (define_arg) @macro)

(syscall_definition
  (identifier) @function)
(struct_definition
  (identifier) @struct)
(union_definition
  (identifier) @struct)

(syscall_parameter
  (identifier) @parameter)

(struct_field
  (identifier) @property)
(union_field
  (identifier) @property)

(type_definition
  (identifier) @variable)
(flag_definition
  (identifier) @variable)
(resource_definition
  (identifier) @variable)

(variant) @macro
(meta_definition
  (identifier) @macro)

(type
  (identifier) @type)
(builtin_type) @type
(syscall_attribute) @type
(union_attribute) @type
(struct_field_attribute) @type

"include" @keyword
"type" @keyword
"meta" @keyword
"resource" @keyword
"define" @keyword`;

// A list of used token types and modifiers needs to be provided to VSCode as a "legend"
const legend = (function() {
	const tokenTypesLegend = [
		'comment', 'string', 'keyword', 'number', 'type', 'struct', 'function',
		'macro', 'variable', 'parameter', 'property'
	];

	return new vscode.SemanticTokensLegend(tokenTypesLegend, []);
})();

export async function activate(context: vscode.ExtensionContext) {
  // Create a tree-sitter parser for syzlang
  await Parser.init();
  const parser = new Parser();
  parser.setLanguage(await Parser.Language.load(path.join(__dirname, '../tree-sitter-syzlang.wasm')));

  // Create a query of tokens to highlight
  const query = parser.getLanguage().query(queries);

  // Create and register the semantic tokens provider
  let semanticTokensProvider = new SyzlangSemanticTokensProvider(parser, query);
  context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider(
    { language: 'syzlang' }, semanticTokensProvider, legend ));
}

class SyzlangSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
  constructor(readonly parser: Parser, readonly query: any) {}

  provideDocumentSemanticTokens(document: vscode.TextDocument, _: vscode.CancellationToken): vscode.ProviderResult<vscode.SemanticTokens> {
    // Parse the file's content and capture the result of the query
    const tree = this.parser.parse(document.getText());
    const rootNode = tree.rootNode;
    const captures = this.query.captures(rootNode);

    // Convert the array of captures into an array of VSCode tokens
    const builder = new vscode.SemanticTokensBuilder(legend);
    for (const capture of captures) {
      const tokenType = capture.name;
      const start = capture.node.startPosition;
      const end = capture.node.endPosition;
      const range = new vscode.Range(new vscode.Position(start.row, start.column),
                                     new vscode.Position(end.row, end.column))

      for (let i = range.start.line; i <= range.end.line; i++) {
        let lineRange = document.lineAt(i).range;
        let start = (i === range.start.line) ? range.start : lineRange.start;
        let end = (i === range.end.line) ? range.end : lineRange.end;
        let newRange = new vscode.Range(start, end);

        builder.push(newRange, tokenType, []);
      }
    }
    return builder.build();
  }
}