// This file sets up axios - the library we use to make HTTP requests to our backend
// The special thing here: it automatically refreshes the token when it expires

import axios from 'axios'

// Create an axios instance with our backend URL as the base
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true // This is needed to send/receive cookies (refresh token)
})

// REQUEST INTERCEPTOR
// Before every request, attach the access token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// RESPONSE INTERCEPTOR
// If a request fails with 401 (token expired), automatically get a new token and retry
api.interceptors.response.use(
  // If response is OK, just return it
  (response) => response,

  // If response has an error
  async (error) => {
    const originalRequest = error.config

    // If it's a 401 error AND we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true // Mark so we don't get into infinite loop

      try {
        // Ask backend for a new access token using our refresh token (in cookie)
        const response = await axios.post(
          'http://localhost:5000/api/auth/refresh',
          {},
          { withCredentials: true }
        )

        const newToken = response.data.accessToken

        // Save the new token
        localStorage.setItem('accessToken', newToken)

        // Update the original request with the new token and retry it
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh token also expired - force user to log in again
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
