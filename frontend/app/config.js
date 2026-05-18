// frontend/app/config.js

// This logic runs once here.
// If we are in the cloud, it uses the Cloud Run URL.
// If we are on your laptop, it uses localhost.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';