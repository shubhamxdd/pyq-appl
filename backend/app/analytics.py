from posthog import Posthog
from .config import settings

# Initialize PostHog client
ph_client = Posthog(
    settings.POSTHOG_API_KEY, 
    host=settings.POSTHOG_HOST,
    debug=True  # Helpful for debugging delivery issues
)

# Gracefully disable if no API key is provided
if not settings.POSTHOG_API_KEY:
    print("⚠️ [POSTHOG] Disabled: No API Key found in settings")
    ph_client.disabled = True
else:
    print(f"✅ [POSTHOG] Initialized with Key: {settings.POSTHOG_API_KEY[:8]}***")
