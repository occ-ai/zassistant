
import * as vscode from 'vscode';
let config = vscode.workspace.getConfiguration("zassistant");
let enabled = config.get("enable", true);
let lastChar = '';
let lastTime = 0;
export function activate(context: vscode.ExtensionContext) {

	//状态栏
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
	statusBarItem.command = 'occai.zassistant';
	updateStatusBar(statusBarItem);
	statusBarItem.show();

	// 注册命令
	let disposable = vscode.commands.registerCommand('occai.zassistant', async () => {
		enabled = !enabled;
		await vscode.workspace.getConfiguration("zassistant").update("enable", enabled, vscode.ConfigurationTarget.Global);
		updateStatusBar(statusBarItem);

	});

	const fun = vscode.workspace.onDidChangeTextDocument(async event => {
		//撤销和恢复跳过
		if (event.reason === vscode.TextDocumentChangeReason.Undo) {
			return
		} else if (event.reason === vscode.TextDocumentChangeReason.Redo) {
			return
		}
		zassistant(event)
	});

	context.subscriptions.push(fun);
	context.subscriptions.push(disposable);
	context.subscriptions.push(statusBarItem);



}

async function zassistant(event: vscode.TextDocumentChangeEvent) {
	if (!enabled) return
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.document !== event.document) return;

	const changes = event.contentChanges;
	if (changes.length != 1) return;
	const change1 = changes[0];
	let sun = 1
	let isSingleCharInput =
		change1.text.length === 1 &&
		!change1.text.includes('\n');
	if (change1.text == "——") {
		isSingleCharInput = true
		sun = 2
	}

	if (!isSingleCharInput) return;

	for (const change of event.contentChanges) {
		if (!change.range.isSingleLine) continue;

		const lineText = change.text
		const newText = lineText;

		// 不处理字符串内部内容
		const rangesToIgnore = getStringLiteralRanges(newText);
		const shouldIgnore = rangesToIgnore.some(r =>
			change.range.start.character >= r.start && change.range.start.character <= r.end
		);

		if (shouldIgnore) return;

		let replacedText = newText
			.replace(/（/g, '(')
			.replace(/）/g, ')')
			.replace(/，/g, ',')
			.replace(/“/g, '"')
			.replace(/”/g, '"')
			.replace(/’/g, "'")
			.replace(/‘/g, "'")
			.replace(/；/g, ';')
			.replace(/？/g, '?')
			.replace(/【/g, '[')
			.replace(/】/g, ']')
			.replace(/：/g, ':')
			.replace(/——/g, '_')
			.replace(/、/g, '\\')
			.replace(/。/g, '.');
		if (replacedText !== newText) {
			await editor.edit((editBuilder) => {
				// 删除原字符
				editBuilder.delete(
					new vscode.Range(
						change.range.start,
						change.range.start.translate(0, sun)
					)
				);
			},
				{
					undoStopAfter: false,
					undoStopBefore: false,
				})
			if (/[^\x00-\x7F]/.test(change1.text) && isCompositionRepeat(change1.text)) {

				return;
			}
			await vscode.commands.executeCommand('default:type', { text: replacedText });




		}
	}
}
function isCompositionRepeat(text: string): boolean {
	const now = Date.now();
	if (text === lastChar && now - lastTime < 100) {
		return true; // 跳过输入法重复
	}
	lastChar = text;
	lastTime = now;
	return false;
}
function getStringLiteralRanges(line: string): { start: number; end: number }[] {
	const ranges: { start: number; end: number }[] = [];
	let inString = false;
	let start = 0;
	let quoteChar = '';

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if ((char === '"' || char === "'") && (i === 0 || line[i - 1] !== '\\') && (i === 0 || line[i - 1] !== '#')) {
			if (!inString) {
				inString = true;
				quoteChar = char;
				start = i;
			} else if (char === quoteChar) {
				inString = false;
				ranges.push({ start, end: i });
			}
		}
	}
	return ranges;
}

function updateStatusBar(item: vscode.StatusBarItem) {
	item.text = `${enabled ? '√ ' : '✗ '} 中英符号转换`;
}
export function deactivate() { }
