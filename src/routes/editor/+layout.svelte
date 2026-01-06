<script lang="ts">
	/**
	 * Protected layout for editor routes.
	 * Requires authentication to access.
	 */

	import { AuthGuard } from "$lib/components";

	let { children } = $props();
</script>

<AuthGuard redirectTo="/login">
	{#snippet children()}
		{#if children}
			{@render children()}
		{/if}
	{/snippet}

	{#snippet loading()}
		<div class="flex items-center justify-center min-h-screen bg-stone-50">
			<div class="text-stone-600">Checking authentication...</div>
		</div>
	{/snippet}
</AuthGuard>
