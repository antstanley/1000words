<script lang="ts">
	/**
	 * Homepage - story listings with pagination.
	 */

	import { StoryCard } from "$lib/components";
	import type { StoryMetadata } from "$lib/types";

	// Mock stories for development - will be replaced with real data
	const mockStories: StoryMetadata[] = [
		{
			id: "1",
			title: "The Last Letter",
			authorDid: "did:plc:example1",
			authorName: "Sarah Chen",
			storageKey: "stories/1.txt",
			wordCount: 987,
			excerpt:
				"The envelope arrived on a Tuesday, yellowed with age and bearing a postmark from thirty years ago. Maria turned it over in her hands, recognizing her mother's handwriting...",
			tags: ["fiction", "family"],
			publishedAt: new Date("2024-01-15"),
			updatedAt: new Date("2024-01-15"),
			createdAt: new Date("2024-01-15"),
		},
		{
			id: "2",
			title: "Morning at the Pier",
			authorDid: "did:plc:example2",
			authorName: "James Morrison",
			storageKey: "stories/2.txt",
			wordCount: 962,
			excerpt:
				"The fog rolled in like a slow tide, swallowing the fishing boats one by one. Old Tom sat on his usual crate, mending nets with fingers that remembered every knot...",
			tags: ["fiction", "nature"],
			publishedAt: new Date("2024-01-14"),
			updatedAt: new Date("2024-01-14"),
			createdAt: new Date("2024-01-14"),
		},
		{
			id: "3",
			title: "Digital Ghosts",
			authorDid: "did:plc:example3",
			authorName: "Ava Patel",
			storageKey: "stories/3.txt",
			wordCount: 998,
			excerpt:
				"They found the server farm abandoned, but the machines still hummed. Inside, thousands of conversations continued—echoes of people who had long since logged off for the last time...",
			tags: ["scifi", "technology"],
			publishedAt: new Date("2024-01-13"),
			updatedAt: new Date("2024-01-13"),
			createdAt: new Date("2024-01-13"),
		},
	];

	let stories = $state<StoryMetadata[]>(mockStories);
	let currentPage = $state(1);
	const storiesPerPage = 10;
	const totalPages = $derived(Math.ceil(stories.length / storiesPerPage));
	const displayedStories = $derived(
		stories.slice((currentPage - 1) * storiesPerPage, currentPage * storiesPerPage)
	);
</script>

<div class="min-h-screen bg-paper">
	<header class="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10 safe-top">
		<div class="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
			<a href="/" class="text-xl sm:text-2xl font-serif text-ink hover:text-ink-muted transition-colors">
				1000 Words
			</a>
			<nav class="flex items-center gap-4">
				<a href="/editor" class="text-sm text-ink-muted hover:text-ink transition-colors touch-target flex items-center justify-center">
					Write
				</a>
			</nav>
		</div>
	</header>

	<main class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
		<section class="mb-6 sm:mb-8">
			<h1 class="text-2xl sm:text-3xl font-serif text-ink mb-2">Stories</h1>
			<p class="text-sm sm:text-base text-ink-muted">
				Human-written stories, exactly 950-1000 words.
			</p>
		</section>

		<section class="story-list space-y-4">
			{#each displayedStories as story (story.id)}
				<StoryCard {story} />
			{/each}

			{#if stories.length === 0}
				<div class="text-center py-12 text-ink-muted">
					<p>No stories yet. Be the first to share yours.</p>
					<a href="/editor" class="inline-block mt-4 text-ink hover:underline">
						Write a story
					</a>
				</div>
			{/if}
		</section>

		{#if totalPages > 1}
			<nav class="pagination mt-8 flex items-center justify-center gap-2">
				<button
					onclick={() => (currentPage = Math.max(1, currentPage - 1))}
					disabled={currentPage === 1}
					class="px-3 py-1 text-sm text-ink-muted hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Previous
				</button>

				<span class="text-sm text-ink-muted">
					Page {currentPage} of {totalPages}
				</span>

				<button
					onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
					disabled={currentPage === totalPages}
					class="px-3 py-1 text-sm text-ink-muted hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Next
				</button>
			</nav>
		{/if}
	</main>

	<footer class="border-t border-stone-200 mt-8 sm:mt-12 safe-bottom">
		<div class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-ink-light">
			<p>Stories written by humans. 950-1000 words each.</p>
		</div>
	</footer>
</div>
