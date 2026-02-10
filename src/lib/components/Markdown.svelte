<script lang="ts">
import { renderMarkdown } from '$lib/services/markdown';
import './markdown.css';

interface Props {
  content: string;
  class?: string;
}

let { content, class: className = '' }: Props = $props();

let html = $derived(renderMarkdown(content));
</script>

<div class="markdown-body {className}">
	{@html html}
</div>
