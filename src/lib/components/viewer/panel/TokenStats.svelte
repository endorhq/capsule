<script lang="ts">
import type { TokenUsage } from '$lib/types/timeline';

interface Props {
  tokens?: TokenUsage;
  cost?: number;
}

let { tokens, cost }: Props = $props();

function fmt(n: number | undefined): string {
  if (n === undefined) return '-';
  return n.toLocaleString('en-US');
}
</script>

{#if tokens}
	<div class="space-y-3">
		<div class="text-xs text-muted">// tokens_and_cost</div>

		<div class="space-y-2 text-sm">
			{#if tokens.input !== undefined}
				<div class="flex justify-between">
					<span class="text-muted">input tokens</span>
					<span class="text-foreground">{fmt(tokens.input)}</span>
				</div>
			{/if}
			{#if tokens.output !== undefined}
				<div class="flex justify-between">
					<span class="text-muted">output tokens</span>
					<span class="text-foreground">{fmt(tokens.output)}</span>
				</div>
			{/if}
			{#if tokens.cached !== undefined && tokens.cached > 0}
				<div class="flex justify-between">
					<span class="text-muted">cache read</span>
					<span class="text-foreground">{fmt(tokens.cached)}</span>
				</div>
			{/if}
			{#if tokens.reasoning !== undefined && tokens.reasoning > 0}
				<div class="flex justify-between">
					<span class="text-muted">reasoning</span>
					<span class="text-foreground">{fmt(tokens.reasoning)}</span>
				</div>
			{/if}
			{#if tokens.total !== undefined}
				<div class="flex justify-between">
					<span class="text-muted">total</span>
					<span class="text-foreground font-medium">{fmt(tokens.total)}</span>
				</div>
			{/if}
			{#if cost !== undefined}
				<div class="flex justify-between pt-1 border-t border-edge">
					<span class="text-muted">total cost</span>
					<span class="text-accent font-medium">${cost.toFixed(3)}</span>
				</div>
			{/if}
		</div>
	</div>
{/if}
