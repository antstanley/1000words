<script lang="ts">
	/**
	 * WYSIWYG editor component using Tiptap/ProseMirror.
	 * Provides rich text editing for story writing with markdown shortcuts.
	 *
	 * Markdown shortcuts supported:
	 * - **bold** or __bold__ for bold text
	 * - *italic* or _italic_ for italic text
	 * - # Heading 1, ## Heading 2, ### Heading 3
	 * - > for blockquotes
	 * - - or * for bullet lists
	 * - 1. for numbered lists
	 * - --- for horizontal rule
	 */

	import { onMount, onDestroy } from "svelte";
	import { Editor } from "@tiptap/core";
	import StarterKit from "@tiptap/starter-kit";
	import Typography from "@tiptap/extension-typography";
	import Placeholder from "@tiptap/extension-placeholder";

	interface Props {
		/** Initial content (HTML string) */
		content?: string;
		/** Placeholder text */
		placeholder?: string;
		/** Callback when content changes */
		onUpdate?: (html: string, text: string) => void;
		/** Whether the editor is disabled */
		disabled?: boolean;
	}

	let {
		content = "",
		placeholder = "Start writing your story...",
		onUpdate,
		disabled = false,
	}: Props = $props();

	let editorElement: HTMLDivElement;
	let editor: Editor | null = $state(null);

	onMount(() => {
		editor = new Editor({
			element: editorElement,
			extensions: [
				StarterKit.configure({
					// Configure starter kit options
					heading: {
						levels: [1, 2, 3],
					},
					// Disable code blocks for story writing
					codeBlock: false,
					code: false,
				}),
				// Typography for smart quotes, dashes, etc.
				Typography,
				// Placeholder text
				Placeholder.configure({
					placeholder,
				}),
			],
			content,
			editable: !disabled,
			editorProps: {
				attributes: {
					class: "prose prose-stone max-w-none focus:outline-none min-h-[400px]",
				},
			},
			onUpdate: ({ editor: ed }) => {
				if (onUpdate) {
					onUpdate(ed.getHTML(), ed.getText());
				}
			},
		});
	});

	onDestroy(() => {
		if (editor) {
			editor.destroy();
		}
	});

	// Update editable state when disabled prop changes
	$effect(() => {
		if (editor) {
			editor.setEditable(!disabled);
		}
	});

	// Expose methods for external control
	export function getHTML(): string {
		return editor?.getHTML() ?? "";
	}

	export function getText(): string {
		return editor?.getText() ?? "";
	}

	export function setContent(newContent: string): void {
		editor?.commands.setContent(newContent);
	}

	export function focus(): void {
		editor?.commands.focus();
	}

	export function clear(): void {
		editor?.commands.clearContent();
	}
</script>

<div class="editor-wrapper">
	<div
		bind:this={editorElement}
		class="editor-container bg-white rounded-lg border border-stone-200 p-4 sm:p-6 min-h-[400px] focus-within:border-stone-400 focus-within:ring-1 focus-within:ring-stone-400 transition-all"
	></div>
</div>

<style>
	:global(.editor-container .ProseMirror) {
		outline: none;
		min-height: 400px;
	}

	/* Placeholder styling using Tiptap's is-empty class */
	:global(.editor-container .ProseMirror p.is-editor-empty:first-child::before) {
		color: var(--color-ink-light, #78716c);
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}

	/* Keyboard shortcut hints in prose */
	:global(.editor-container .ProseMirror kbd) {
		background: var(--color-paper-dark, #f5f4f2);
		border: 1px solid var(--color-ink-light, #78716c);
		border-radius: 0.25rem;
		padding: 0.125rem 0.375rem;
		font-size: 0.75em;
		font-family: ui-monospace, monospace;
	}
</style>
