<script lang="ts">
	/**
	 * Story display component for rendering a single story with proper typography.
	 */

	import type { StoryMetadata } from "$lib/types";

	interface Props {
		/** Story metadata */
		story: StoryMetadata;
		/** Story content (HTML or plain text) */
		content: string;
		/** Whether content is HTML (default: false, treats as plain text) */
		isHtml?: boolean;
	}

	let { story, content, isHtml = false }: Props = $props();

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		}).format(date instanceof Date ? date : new Date(date));
	}
</script>

<article class="story">
	<header class="story-header mb-6 sm:mb-8">
		<h1 class="text-2xl sm:text-3xl font-serif font-medium text-ink mb-3 sm:mb-4 leading-tight">
			{story.title}
		</h1>

		<div class="story-meta flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs sm:text-sm text-ink-muted">
			<span class="author">
				By <span class="font-medium text-ink">{story.authorName}</span>
			</span>
			<span class="date">
				{formatDate(story.publishedAt)}
			</span>
			<span class="word-count">
				{story.wordCount} words
			</span>
		</div>

		{#if story.tags && story.tags.length > 0}
			<div class="story-tags mt-3 flex flex-wrap gap-2">
				{#each story.tags as tag}
					<span class="tag px-2 py-0.5 text-xs bg-paper-dark text-ink-muted rounded">
						{tag}
					</span>
				{/each}
			</div>
		{/if}
	</header>

	<div class="prose prose-sm sm:prose-base story-content">
		{#if isHtml}
			{@html content}
		{:else}
			{#each content.split("\n\n") as paragraph}
				{#if paragraph.trim()}
					<p>{paragraph}</p>
				{/if}
			{/each}
		{/if}
	</div>

	<footer class="story-footer mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-ink-light/20">
		<div class="text-xs sm:text-sm text-ink-muted">
			{#if story.updatedAt && story.updatedAt > story.publishedAt}
				<span>Updated {formatDate(story.updatedAt)}</span>
			{/if}
		</div>
	</footer>
</article>
