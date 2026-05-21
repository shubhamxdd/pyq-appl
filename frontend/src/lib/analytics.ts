import posthog from 'posthog-js';

/**
 * Capture a custom event with properties
 */
export const trackEvent = (event: string, properties?: Record<string, any>) => {
  posthog.capture(event, properties);
};

/**
 * Identify user and set person properties
 */
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  posthog.identify(userId, properties);
};

/**
 * Reset user identity on logout
 */
export const resetUser = () => {
  posthog.reset();
};
