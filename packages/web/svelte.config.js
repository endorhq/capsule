const isCloudflare = process.env.ADAPTER === 'cloudflare';

const { default: adapter } = await import(
  isCloudflare ? '@sveltejs/adapter-cloudflare' : '@sveltejs/adapter-node'
);

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
  },
};

export default config;
