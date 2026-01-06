<script lang="ts">
	/**
	 * Editor page - protected route for writing stories.
	 */

	import { auth, currentUser } from "$lib/stores";

	async function handleLogout() {
		await auth.logout();
	}
</script>

<div class="min-h-screen bg-stone-50">
	<header class="bg-white border-b border-stone-200 px-6 py-4">
		<div class="max-w-4xl mx-auto flex items-center justify-between">
			<h1 class="text-xl font-serif text-stone-800">1000 Words</h1>
			<div class="flex items-center gap-4">
				{#if $currentUser}
					<span class="text-sm text-stone-600">
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
					class="text-sm text-stone-600 hover:text-stone-800"
				>
					Sign out
				</button>
			</div>
		</div>
	</header>

	<main class="max-w-4xl mx-auto px-6 py-8">
		<div class="bg-white rounded-lg shadow-sm p-8">
			<h2 class="text-2xl font-serif text-stone-800 mb-4">Write Your Story</h2>
			<p class="text-stone-600 mb-6">
				Share your story with the world. Remember: 950-1000 words, written by you.
			</p>

			<!-- Placeholder for the actual editor -->
			<div class="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center text-stone-500">
				Editor coming soon...
			</div>
		</div>
	</main>
</div>
