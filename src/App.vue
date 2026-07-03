<script setup></script>

<template>
  <main>
    <header class="brand">
      <div class="logo">
        <svg class="logo-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <path
            d="M4 16c0-2.5 2-4.5 4.5-4.5S13 13.5 13 16s-2 4.5-4.5 4.5S4 18.5 4 16z"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M13 16h15"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        <h1>Untangle</h1>
      </div>
      <p class="tagline">Space to think</p>
    </header>
  </main>
</template>

<style scoped>
.brand {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  width: 1.75rem;
  height: 1.75rem;
  color: #1a1a1a;
  flex-shrink: 0;
}

h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a1a;
}

.tagline {
  margin: 0.25rem 0 0 2.25rem;
  font-size: 0.85rem;
  font-weight: 400;
  color: #767676;
}
</style>
