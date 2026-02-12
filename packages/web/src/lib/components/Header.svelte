<script lang="ts">
import StarIcon from 'virtual:icons/dinkie-icons/white-medium-star';
import logo from '$lib/assets/logo.svg';
</script>

<header
  class="flex items-center justify-between px-4 h-12 border-b border-edge shrink-0"
>
  <div class="flex items-center gap-3">
    <a
      href="https://capsule.endor.dev"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img class="h-6" src={logo} alt="Endor logo" />
    </a>
    <span class="text-edge-dashed">|</span>
    <span class="text-sm text-foreground-bright font-medium tracking-wide"
      >Capsule</span
    >
    <span class="text-xs text-muted hidden sm:inline"
      ><span class="text-muted/50">//</span> An interactive AI agent session
      inspector</span
    >
  </div>
  <nav class="flex items-center gap-6 text-sm text-muted">
    <a
      href="https://docs.endor.dev"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:text-accent transition-colors duration-200"
    >
      Docs
    </a>
    <a
      href="https://discord.gg/ruMJaQqVKa"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:text-accent transition-colors duration-200"
    >
      Discord
    </a>
    <a
      href="https://github.com/endorhq/capsule"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-edge hover:border-accent/50 hover:text-accent transition-all duration-200"
    >
      <StarIcon />
      Star on GitHub
    </a>
  </nav>
</header>
