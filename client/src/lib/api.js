const resolveApiBase = () => {
  const configuredBase = import.meta.env.VITE_API_BASE_URL

  if (!configuredBase) {
    return `${window.location.protocol}//${window.location.hostname}:5000/api`
  }

  try {
    const url = new URL(configuredBase)
    const isLocalAddress = ['localhost', '127.0.0.1'].includes(url.hostname)
    const currentIsLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)

    if (isLocalAddress && currentIsLocal) {
      url.hostname = window.location.hostname
      return url.toString().replace(/\/$/, '')
    }

    return configuredBase
  } catch (_error) {
    return configuredBase
  }
}

const API_BASE = resolveApiBase()
const DEBUG_AI = import.meta.env.VITE_DEBUG_AI === 'true'

const request = async (path, options = {}) => {
  if (DEBUG_AI && path === '/forms/generate') {
    console.log('[api] POST /forms/generate payload:', options.body)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? {Authorization: `Bearer ${options.token}`} : {}),
      ...(options.headers || {})
    },
    ...options
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  if (DEBUG_AI && path === '/forms/generate') {
    console.log('[api] /forms/generate response meta:', data?.meta)
    console.log(
      '[api] /forms/generate questions:',
      (data?.form?.questions || []).map((q) => ({id: q.id, title: q.title, type: q.type}))
    )
  }

  return data
}

export const api = {
  signup: (payload) =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  login: (payload) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  me: (token) =>
    request('/auth/me', {
      token
    }),
  listForms: (token) =>
    request('/forms', {
      token
    }),
  generateForm: (prompt, token) =>
    request('/forms/generate', {
      method: 'POST',
      token,
      body: JSON.stringify({prompt})
    }),
  updateForm: (id, payload, token) =>
    request(`/forms/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload)
    }),
  getDashboard: (id, token) =>
    request(`/forms/${id}/dashboard`, {
      token
    }),
  getPublicForm: (slug) => request(`/public/forms/${slug}`),
  submitResponse: (slug, answers) =>
    request(`/public/forms/${slug}/responses`, {
      method: 'POST',
      body: JSON.stringify({answers})
    })
}