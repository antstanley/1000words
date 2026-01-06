<script lang="ts">
	/**
	 * Login page for Atproto OAuth authentication.
	 */

	import { goto } from "$app/navigation";
	import { auth, authLoading, isAuthenticatedStore } from "$lib/stores";

	let handle = $state("");
	let error = $state("");
	let isLoggingIn = $state(false);

	// Redirect if already authenticated
	$effect(() => {
		if (!$authLoading && $isAuthenticatedStore) {
			goto("/editor");
		}
	});

	async function handleLogin(event: Event) {
		event.preventDefault();

		if (!handle.trim()) {
			error = "Please enter your handle";
			return;
		}

		error = "";
		isLoggingIn = true;

		try {
			await auth.login(handle.trim());
			// User will be redirected to their PDS for authorization
		} catch (e) {
			error = e instanceof Error ? e.message : "Login failed";
			isLoggingIn = false;
		}
	}
</script>

<div class="min-h-screen bg-stone-50 flex items-center justify-center px-4">
	<div class="max-w-md w-full">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-serif text-stone-800">1000 Words</h1>
			<p class="text-stone-600 mt-2">Sign in with your Bluesky account</p>
		</div>

		<form onsubmit={handleLogin} class="bg-white p-8 rounded-lg shadow-sm">
			<div class="mb-6">
				<label for="handle" class="block text-sm font-medium text-stone-700 mb-2">
					Handle
				</label>
				<input
					type="text"
					id="handle"
					bind:value={handle}
					placeholder="user.bsky.social"
					class="w-full px-4 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
					disabled={isLoggingIn}
				/>
			</div>

			{#if error}
				<div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
					{error}
				</div>
			{/if}

			<button
				type="submit"
				disabled={isLoggingIn || $authLoading}
				class="w-full py-2 px-4 bg-stone-800 text-white rounded-md hover:bg-stone-700 disabled:bg-stone-400 disabled:cursor-not-allowed transition-colors"
			>
				{#if isLoggingIn || $authLoading}
					Signing in...
				{:else}
					Sign in with Bluesky
				{/if}
			</button>
		</form>

		<p class="text-center text-sm text-stone-500 mt-6">
			Don't have a Bluesky account?
			<a
				href="https://bsky.app"
				target="_blank"
				rel="noopener noreferrer"
				class="text-stone-700 hover:underline"
			>
				Create one
			</a>
		</p>
	</div>
</div>
