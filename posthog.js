const POSTHOG_TOKEN = 'phc_y15r12flE4emZrCDkAh4upaz9c204yAKaZ8Hb5eIUlj'
const POSTHOG_API_HOST = 'https://us.posthog.com'
const POSTHOG_SCRIPT_SRC = `${POSTHOG_API_HOST}/static/array.js`

const queuedMethods = [
  'capture',
  'register',
  'register_once',
  'unregister',
  'opt_out_capturing',
  'has_opted_out_capturing',
  'opt_in_capturing',
  'reset',
  'isFeatureEnabled',
  'onFeatureFlags',
  'getFeatureFlag',
  'getFeatureFlagPayload',
  'reloadFeatureFlags',
  'group',
  'setPersonProperties',
  'setPersonPropertiesForFlags',
  'resetPersonPropertiesForFlags',
  'setGroupPropertiesForFlags',
  'resetGroupPropertiesForFlags',
  'resetGroup',
]

const posthogQueue = window.posthog || []
window.posthog = posthogQueue

for (const method of queuedMethods) {
  posthogQueue[method] = (...args) => {
    posthogQueue.push([method, ...args])
  }
}

posthogQueue._i = posthogQueue._i || []
posthogQueue.init = (token, config, namespace = 'posthog') => {
  posthogQueue._i.push([token, config, namespace])
}

posthogQueue.init(POSTHOG_TOKEN, {
  api_host: POSTHOG_API_HOST,
  capture_pageview: true,
  capture_pageleave: true,
})

const script = document.createElement('script')
script.async = true
script.src = POSTHOG_SCRIPT_SRC
document.head.appendChild(script)
