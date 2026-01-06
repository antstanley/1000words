<script lang="ts">
	/**
	 * AuthGuard component for protecting routes.
	 * Redirects unauthenticated users to login or shows loading state.
	 */

	import { goto } from "$app/navigation";
	import { auth, authLoading, isAuthenticatedStore } from "$lib/stores";

	interface Props {
		/** URL to redirect to when not authenticated */
		redirectTo?: string;
		/** Content to show while checking auth */
		children?: import("svelte").Snippet;
		/** Content to show while loading */
		loading?: import("svelte").Snippet;
	}

	let { redirectTo = "/login", children, loading }: Props = $props();

	$effect(() => {
		if (!$authLoading && !$isAuthenticatedStore) {
			goto(redirectTo);
		}
	});
</script>

{#if $authLoading}
	{#if loading}
		{@render loading()}
	{:else}
		<div class="flex items-center justify-center min-h-screen">
			<div class="text-stone-600">Loading...</div>
		</div>
	{/if}
{:else if $isAuthenticatedStore}
	{#if children}
		{@render children()}
	{/if}
{/if}
