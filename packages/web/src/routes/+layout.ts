import posthog from 'posthog-js';
import { browser, dev } from '$app/environment';
import { isLocal } from '$lib/features';

export const load = async () => {
  if (browser) {
    const disabled = dev || isLocal;
    const token = disabled
      ? 'fake'
      : 'phc_82LG8kNsHbqSicP9R3C2RXBAy7ePJ8SvPeQiBjtzjro';

    posthog.init(token, {
      api_host: 'https://eu.i.posthog.com',
      person_profiles: 'identified_only',
      persistence: 'memory',
      capture_pageview: false,
      capture_pageleave: false,
      loaded: ph => {
        if (disabled) {
          ph.opt_out_capturing();
        }
      },
    });
  }

  return;
};
