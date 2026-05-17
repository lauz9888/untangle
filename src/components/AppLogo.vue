<template>
  <svg
    class="app-logo"
    width="42"
    height="26"
    viewBox="0 0 42 26"
    fill="none"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Left loop: the tangle -->
    <path
      d="M21 13 C20 9 17 3 11 3 C5 3 2 8 2 13 C2 18 5 23 11 23 C17 23 20 17 21 13 Z"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linejoin="round"
    />
    <!-- Right curve: being untangled — fades out to suggest the free end -->
    <path
      d="M21 13 C22 9 25 3 31 3 C37 3 40 8 40 13 C40 18 37 23 31 23 C27 23 24 21 22 18"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      opacity="0.35"
    />
  </svg>
</template>

<style scoped>
.app-logo {
  color: var(--accent);
  flex-shrink: 0;
}
</style>
