<script lang="ts">
	/**
	 * Editor page - protected route for writing stories.
	 * Includes WYSIWYG editor with preview mode toggle and auto-save.
	 */

	import { onMount } from "svelte";
	import { Editor, Story } from "$lib/components";
	import { auth, currentUser, drafts } from "$lib/stores";
	import type { StoryMetadata } from "$lib/types";

	let storyTitle = $state("");
	let wordCount = $state(0);
	let editorContent = $state("");
	let isPreviewMode = $state(false);
	let lastSaved = $state<Date | null>(null);
	let editorRef: Editor | null = $state(null);

	// Load saved draft on mount
	onMount(() => {
		const savedDraft = drafts.load();
		if (savedDraft) {
			storyTitle = savedDraft.title;
			editorContent = savedDraft.content;
			lastSaved = new Date(savedDraft.savedAt);

			// Set editor content after mount
			setTimeout(() => {
				editorRef?.setContent(savedDraft.content);
			}, 100);
		}
	});

	function handleEditorUpdate(html: string, text: string) {
		editorContent = html;
		// Count words (split by whitespace, filter empty)
		const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
		wordCount = words.length;

		// Mark as dirty for auto-save
		drafts.markDirty(storyTitle, html);
	}

	function handleTitleChange() {
		// Mark as dirty when title changes
		drafts.markDirty(storyTitle, editorContent);
	}

	async function handleLogout() {
		// Save before logout
		if (storyTitle || editorContent) {
			drafts.saveNow(storyTitle, editorContent);
		}
		await auth.logout();
	}

	function togglePreview() {
		isPreviewMode = !isPreviewMode;
	}

	function clearDraft() {
		if (confirm("Are you sure you want to discard this draft?")) {
			drafts.clear();
			storyTitle = "";
			editorContent = "";
			editorRef?.clear();
			lastSaved = null;
		}
	}

	// Subscribe to drafts store to update lastSaved
	$effect(() => {
		const unsubscribe = drafts.subscribe((draft) => {
			if (draft) {
				lastSaved = new Date(draft.savedAt);
			}
		});
		return unsubscribe;
	});

	// Format last saved time
	const lastSavedText = $derived(() => {
		if (!lastSaved) return null;
		const now = new Date();
		const diffMs = now.getTime() - lastSaved.getTime();
		const diffSecs = Math.floor(diffMs / 1000);

		if (diffSecs < 5) return "Saved just now";
		if (diffSecs < 60) return `Saved ${diffSecs}s ago`;
		const diffMins = Math.floor(diffSecs / 60);
		if (diffMins < 60) return `Saved ${diffMins}m ago`;
		return `Saved at ${lastSaved.toLocaleTimeString()}`;
	});

	const wordCountStatus = $derived(
		wordCount === 0
			? "neutral"
			: wordCount < 950
				? "low"
				: wordCount <= 1000
					? "good"
					: "high"
	);

	const wordCountColor = $derived(
		wordCountStatus === "good"
			? "text-green-600"
			: wordCountStatus === "high"
				? "text-red-600"
				: wordCountStatus === "low"
					? "text-amber-600"
					: "text-ink-muted"
	);

	// Create a mock story object for preview
	const previewStory = $derived<StoryMetadata>({
		id: "draft",
		title: storyTitle || "Untitled Story",
		authorDid: $currentUser?.did || "unknown",
		authorName: $currentUser?.displayName || $currentUser?.handle || "Anonymous",
		storageKey: "",
		wordCount,
		publishedAt: new Date(),
		updatedAt: new Date(),
		createdAt: new Date(),
	});
</script>

<div class="min-h-screen bg-paper">
	<header class="bg-white/80 backdrop-blur-sm border-b border-stone-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-10 safe-top">
		<div class="max-w-4xl mx-auto flex items-center justify-between">
			<a href="/" class="text-xl font-serif text-ink hover:text-ink-muted transition-colors">
				1000 Words
			</a>
			<div class="flex items-center gap-3 sm:gap-4">
				{#if $currentUser}
					<span class="text-sm text-ink-muted hidden sm:inline">
						{$currentUser.displayName || $currentUser.handle}
					</span>
					{#if $currentUser.avatar}
						<img
							src={$currentUser.avatar}
							alt={$currentUser.handle}
							class="w-8 h-8 rounded-full"
						/>
					{/if}
				{/if}
				<button
					onclick={handleLogout}
					class="text-sm text-ink-muted hover:text-ink transition-colors touch-target flex items-center justify-center"
				>
					Sign out
				</button>
			</div>
		</div>
	</header>

	<main class="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
		{#if isPreviewMode}
			<!-- Preview Mode -->
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-sm font-medium text-ink-muted">Preview</h2>
				<button
					onclick={togglePreview}
					class="text-sm text-ink hover:text-ink-muted transition-colors touch-target flex items-center gap-2"
				>
					<span>Back to Editor</span>
				</button>
			</div>

			<div class="bg-white rounded-lg border border-stone-200 p-4 sm:p-8">
				<Story story={previewStory} content={editorContent} isHtml={true} />
			</div>
		{:else}
			<!-- Editor Mode -->
			<div class="mb-6">
				<input
					type="text"
					bind:value={storyTitle}
					oninput={handleTitleChange}
					placeholder="Story Title"
					class="w-full text-2xl sm:text-3xl font-serif text-ink bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-ink-light"
				/>
			</div>

			<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
				<div class="flex items-center gap-3 text-sm text-ink-muted">
					<span>Write your story. 950-1000 words.</span>
					{#if lastSavedText()}
						<span class="text-xs text-ink-light">{lastSavedText()}</span>
					{/if}
				</div>
				<div class="flex items-center gap-4">
					{#if storyTitle || editorContent}
						<button
							onclick={clearDraft}
							class="text-sm text-red-600 hover:text-red-700 transition-colors"
						>
							Discard
						</button>
					{/if}
					<button
						onclick={togglePreview}
						disabled={wordCount === 0}
						class="text-sm text-ink-muted hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Preview
					</button>
					<div class="text-sm {wordCountColor} font-medium">
						{wordCount} / 1000 words
					</div>
				</div>
			</div>

			<Editor
				bind:this={editorRef}
				placeholder="Start writing your story..."
				onUpdate={handleEditorUpdate}
			/>

			<div class="mt-6 flex items-center justify-between">
				<div class="text-sm text-ink-muted">
					{#if wordCountStatus === "good"}
						Ready to publish
					{:else if wordCountStatus === "high"}
						Too many words ({wordCount - 1000} over limit)
					{:else if wordCountStatus === "low" && wordCount > 0}
						{950 - wordCount} more words needed
					{:else}
						Start writing...
					{/if}
				</div>

				<button
					disabled={wordCountStatus !== "good" || !storyTitle.trim()}
					class="px-4 sm:px-6 py-2 bg-ink text-white rounded-md hover:bg-ink-muted disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors touch-target"
				>
					Publish Story
				</button>
			</div>
		{/if}
	</main>
</div>
