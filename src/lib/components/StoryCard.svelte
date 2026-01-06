<script lang="ts">
	/**
	 * Story card component for story listings.
	 * Shows title, author, excerpt, and metadata in a compact card format.
	 */

	import type { StoryMetadata } from "$lib/types";

	interface Props {
		/** Story metadata */
		story: StoryMetadata;
		/** Optional href override (defaults to /story/{id}) */
		href?: string;
	}

	let { story, href }: Props = $props();

	const storyHref = $derived(href ?? `/story/${story.id}`);

	function formatDate(date: Date): string {
		const d = date instanceof Date ? date : new Date(date);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return "Today";
		if (diffDays === 1) return "Yesterday";
		if (diffDays < 7) return `${diffDays} days ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
		}).format(d);
	}
</script>

<a href={storyHref} class="story-card block group">
	<article class="p-4 sm:p-6 bg-white rounded-lg border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all active:scale-[0.99]">
		<h2 class="text-lg sm:text-xl font-serif font-medium text-ink group-hover:text-ink-muted leading-snug mb-2">
			{story.title}
		</h2>

		<div class="text-xs sm:text-sm text-ink-muted mb-2 sm:mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
			<span class="author">{story.authorName}</span>
			<span class="hidden sm:inline">·</span>
			<span class="date">{formatDate(story.publishedAt)}</span>
		</div>

		{#if story.excerpt}
			<p class="text-sm sm:text-base text-ink-muted line-clamp-2 sm:line-clamp-3 leading-relaxed">
				{story.excerpt}
			</p>
		{/if}

		{#if story.tags && story.tags.length > 0}
			<div class="mt-2 sm:mt-3 flex flex-wrap gap-2">
				{#each story.tags.slice(0, 3) as tag}
					<span class="text-xs text-ink-light">#{tag}</span>
				{/each}
			</div>
		{/if}
	</article>
</a>
