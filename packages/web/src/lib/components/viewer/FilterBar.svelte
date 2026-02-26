<script lang="ts">
import SearchIcon from 'virtual:icons/dinkie-icons/right-magnifying-glass';

interface Props {
  value: string;
}

let { value = $bindable() }: Props = $props();
</script>

<div class="flex items-center gap-2 px-4 py-3 border-b border-edge">
  <SearchIcon class="w-4 h-4 text-muted shrink-0" />
  <input
    type="text"
    bind:value
    placeholder="filter messages... /"
    class="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/50 outline-none"
  />
</div>
