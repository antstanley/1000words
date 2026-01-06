<script lang="ts">
	/**
	 * Story detail page - displays a single story with full content.
	 */

	import { page } from "$app/stores";
	import { Story } from "$lib/components";
	import type { StoryMetadata } from "$lib/types";

	// Mock story data - will be replaced with real data loading
	const mockStories: Record<string, { story: StoryMetadata; content: string }> = {
		"1": {
			story: {
				id: "1",
				title: "The Last Letter",
				authorDid: "did:plc:example1",
				authorName: "Sarah Chen",
				storageKey: "stories/1.txt",
				wordCount: 987,
				excerpt: "The envelope arrived on a Tuesday...",
				tags: ["fiction", "family"],
				publishedAt: new Date("2024-01-15"),
				updatedAt: new Date("2024-01-15"),
				createdAt: new Date("2024-01-15"),
			},
			content: `The envelope arrived on a Tuesday, yellowed with age and bearing a postmark from thirty years ago. Maria turned it over in her hands, recognizing her mother's handwriting instantly—the careful loops, the slight rightward slant that spoke of a woman who had learned to write in another era entirely.

She had found it wedged between boxes in the attic, hidden in a place where letters were not meant to be hidden. The paper felt fragile, almost alive with the weight of decades. Maria carried it downstairs to the kitchen, where afternoon light pooled on the worn oak table, and sat down to read.

"My dearest daughter," it began. Maria's breath caught. Her mother had died when she was seven, leaving behind photographs and stories told by others, but never a letter. Never these words, meant only for her.

The letter spoke of ordinary things at first—the garden, the weather, a recipe for the apple cake Maria remembered loving as a child. But then the tone shifted, became something else entirely.

"By the time you read this, if you ever do, I will have been gone for many years. I am writing now because the doctors have told me what I already knew, and I want you to have something of me that is more than memory."

Maria wiped her eyes and continued reading. Her mother wrote about her own childhood, about Maria's father and how they met, about the hopes she had for her daughter's future. She wrote about mistakes she had made and lessons she wished she could teach in person.

"I know you will grow up without me, and I am sorry for that more than I can say. But I want you to know that every moment I have had with you has been a gift. You are fierce and kind and curious about everything. Do not let anyone dull that spark."

The letter went on for pages, filling in gaps Maria hadn't known existed. Her mother's dreams, her fears, the small rebellions of her youth. By the end, Maria felt she knew a whole person she had only glimpsed before in fragments.

"I do not know what kind of woman you will become, but I know you will be remarkable. Trust yourself. Love deeply. And remember that I am with you always, in every choice you make, every path you take."

Maria folded the letter carefully and held it against her chest. Outside, the sun was setting, painting the sky in colors her mother would have loved. She thought about all the years she had lived without these words, and how different they might have been if she had found them sooner.

But perhaps, she realized, this was exactly the right time. Perhaps some letters are meant to find us only when we are ready to truly hear them.

She looked at the photograph on the mantle—her mother at twenty-five, laughing at something just out of frame. For the first time, Maria felt she understood the woman in the picture. Not as a mother lost too soon, but as a person who had lived and loved and hoped, just like anyone else.

Tomorrow, she would call her own daughter. She would tell her about the letter and what it had meant. And maybe, Maria thought, she would start writing letters of her own—words for the future, whenever it might need them.

The kitchen grew dark around her, but Maria didn't move to turn on the lights. She sat with the letter in her hands and let herself grieve, finally and fully, for a mother she had never really lost at all.`,
		},
	};

	const storyId = $derived($page.params.id ?? "");
	const data = $derived(storyId ? mockStories[storyId] : undefined);
	const story = $derived(data?.story);
	const content = $derived(data?.content ?? "");
</script>

<div class="min-h-screen bg-paper">
	<header class="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10 safe-top">
		<div class="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
			<a href="/" class="text-xl sm:text-2xl font-serif text-ink hover:text-ink-muted transition-colors">
				1000 Words
			</a>
			<nav class="flex items-center gap-3 sm:gap-4">
				<a href="/" class="text-sm text-ink-muted hover:text-ink transition-colors touch-target flex items-center justify-center">
					Stories
				</a>
				<a href="/editor" class="text-sm text-ink-muted hover:text-ink transition-colors touch-target flex items-center justify-center">
					Write
				</a>
			</nav>
		</div>
	</header>

	<main class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
		{#if story}
			<Story {story} {content} />
		{:else}
			<div class="text-center py-8 sm:py-12">
				<h1 class="text-xl sm:text-2xl font-serif text-ink mb-4">Story not found</h1>
				<p class="text-sm sm:text-base text-ink-muted mb-4">
					The story you're looking for doesn't exist or has been removed.
				</p>
				<a href="/" class="text-ink hover:underline touch-target inline-flex items-center justify-center">
					Back to stories
				</a>
			</div>
		{/if}
	</main>

	<footer class="border-t border-stone-200 mt-8 sm:mt-12 safe-bottom">
		<div class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-ink-light">
			<p>Stories written by humans. 950-1000 words each.</p>
		</div>
	</footer>
</div>
