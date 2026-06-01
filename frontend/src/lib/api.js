import axios from 'axios'

// In production: set VITE_API_BASE_URL to your Render backend URL
// e.g. https://your-style-transfer-api.onrender.com
// In development: http://localhost:8000 (from frontend/.env)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

export async function stylizeImages(contentFile, styleFile, alpha) {
  const formData = new FormData()
  formData.append('content_image', contentFile)
  formData.append('style_image', styleFile)
  formData.append('alpha', String(alpha))

  try {
    const response = await api.post('/stylize', formData, {
      responseType: 'blob',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error) {
    if (error.response) {
      if (error.response.status === 413) {
        throw new Error("Total upload size is too large — try smaller images")
      }
      let errorMessage = "Request failed with status " + error.response.status
      try {
        const text = await error.response.data.text()
        const parsed = JSON.parse(text)
        if (parsed && parsed.error) {
          errorMessage = parsed.error
        }
      } catch (e) {
        // Fallback to the status code message
      }
      throw new Error(errorMessage)
    } else {
      throw new Error("Could not reach the server — is the backend running?")
    }
  }
}

export default api
