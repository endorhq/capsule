<script lang="ts">
	interface Props {
		value: string;
	}

	let { value = $bindable() }: Props = $props();
</script>

<div class="flex items-center gap-2 px-4 py-3 border-b border-edge">
	<svg
		class="w-4 h-4 text-muted shrink-0"
		fill="none"
		viewBox="0 0 24 24"
		stroke="currentColor"
		stroke-width="1.5"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
		/>
	</svg>
	<input
		type="text"
		bind:value
		placeholder="filter messages... /"
		class="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/50 outline-none"
	/>
</div>
