import {buildFallbackSchema, buildSchemaFromFieldListInput, buildSchemaFromPrompt} from '../utils/formTemplates.js'

const debug = (...args) => {
  if (process.env.DEBUG_AI === 'true') {
    console.log('[aiService]', ...args)
  }
}

const stripCodeFences = (content) => {
  const text = String(content || '')
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return (fenced ? fenced[1] : text).trim()
}

const extractJson = (content) => {
  const cleaned = stripCodeFences(content)

  // First try: parse as-is (some models return strict JSON with no extra text).
  try {
    return JSON.parse(cleaned)
  } catch (_error) {
    // continue
  }

  const firstObject = cleaned.indexOf('{')
  const lastObject = cleaned.lastIndexOf('}')
  if (firstObject !== -1 && lastObject !== -1 && lastObject > firstObject) {
    const slice = cleaned.slice(firstObject, lastObject + 1)
    return JSON.parse(slice)
  }

  const firstArray = cleaned.indexOf('[')
  const lastArray = cleaned.lastIndexOf(']')
  if (firstArray !== -1 && lastArray !== -1 && lastArray > firstArray) {
    const slice = cleaned.slice(firstArray, lastArray + 1)
    return JSON.parse(slice)
  }

  throw new Error('No JSON payload returned by model')
}

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const optionSet = (items) =>
  items
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((item) => ({label: item, value: slugify(item)}))

const safeType = (type, title = '') => {
  const supported = new Set(['short_text', 'long_text', 'email', 'number', 'select', 'radio', 'checkbox', 'date'])
  const normalized = String(type || '').toLowerCase().trim()

  if (supported.has(normalized)) return normalized

  // Accept common aliases from LLM outputs.
  const map = {
    text: 'short_text',
    string: 'short_text',
    textarea: 'long_text',
    paragraph: 'long_text',
    phone: 'short_text',
    tel: 'short_text',
    integer: 'number',
    float: 'number',
    dropdown: 'select',
    multiple_choice: 'radio',
    multiselect: 'checkbox'
  }

  if (map[normalized]) return map[normalized]

  const lower = String(title || '').toLowerCase()
  if (/\b(email|e-mail)\b/.test(lower)) return 'email'
  if (/\b(dob|date of birth|birth date|birthday|date)\b/.test(lower)) return 'date'
  if (/\b(age|years?|count|quantity|number of)\b/.test(lower)) return 'number'
  if (/\b(address)\b/.test(lower)) return 'long_text'
  return 'short_text'
}

const normalizeQuestion = (raw, index, used) => {
  const title = String(raw?.title || raw?.label || `Question ${index + 1}`).trim()
  const type = safeType(raw?.type, title)
  const idBase = slugify(raw?.id || title) || `q_${index + 1}`

  let id = idBase
  let count = 1
  while (used.has(id)) {
    id = `${idBase}_${count}`
    count += 1
  }
  used.add(id)

  const required = raw?.required === false ? false : Boolean(raw?.required ?? true)
  const placeholder = String(raw?.placeholder || '').trim()
  const description = String(raw?.description || '').trim()
  const validation = typeof raw?.validation === 'object' && raw?.validation ? raw.validation : {}

  let options = []
  if (type === 'select' || type === 'radio' || type === 'checkbox') {
    if (Array.isArray(raw?.options)) {
      const list = raw.options.map((opt) => (typeof opt === 'string' ? opt : opt?.label || opt?.value)).filter(Boolean)
      options = optionSet(list)
    }
    if (options.length === 0 && (type === 'radio' || type === 'checkbox') && /\b(rating|rate|score)\b/i.test(title)) {
      options = optionSet(['1', '2', '3', '4', '5'])
    }
  }

  return {id, title, description, type, required, placeholder, options, validation}
}

const normalizeSchema = (parsed, prompt) => {
  const schema = parsed && typeof parsed === 'object' ? parsed : {}
  const title = String(schema.title || 'Custom AI Form').trim() || 'Custom AI Form'
  const description = String(schema.description || `AI-generated form for: ${prompt}`).trim()

  const rawQuestions = Array.isArray(schema.questions)
    ? schema.questions
    : Array.isArray(schema.fields)
      ? schema.fields
      : []

  const used = new Set()
  const questions = rawQuestions.map((q, index) => normalizeQuestion(q, index, used)).filter((q) => q.title)

  return {title, description, questions}
}

const enforcePromptFields = (schema, prompt) => {
  const direct = buildSchemaFromFieldListInput(prompt)
  if (direct) {
    // Strict mode: if user supplied fields explicitly, always return ONLY those fields.
    return {
      ...schema,
      title: direct.title,
      description: direct.description,
      questions: direct.questions
    }
  }

  const derived = buildSchemaFromPrompt(prompt)
  if (!derived) return schema

  const wanted = derived.questions.map((q) => q.title.toLowerCase())
  const got = new Set((schema?.questions || []).map((q) => String(q.title || '').toLowerCase()))
  const matchCount = wanted.filter((title) => got.has(title)).length
  const allMatch = matchCount === wanted.length

  // Strict: if explicit fields are present in prompt, ensure all of them show up in final questions.
  if (!Array.isArray(schema?.questions) || schema.questions.length === 0 || !allMatch) {
    return {
      ...schema,
      title: schema?.title || derived.title,
      description: schema?.description || derived.description,
      questions: derived.questions
    }
  }

  return schema
}

export const generateFormSchema = async (prompt) => {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    debug('No GROQ_API_KEY, using prompt-derived fallback')
    return {
      ...buildFallbackSchema(prompt),
      meta: {provider: 'local-fallback'}
    }
  }

  try {
    debug('Sending prompt to Groq', {prompt})
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'Convert the user prompt into JSON with keys: title, description, fields. Each field must include label, type, required. Optional keys: placeholder, options. Supported types: short_text, long_text, email, number, select, radio, checkbox, date. Return JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`AI request failed with status ${response.status}`)
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content || ''
    debug('Groq raw content (first 240 chars)', content.slice(0, 240))
    const parsed = extractJson(content)
    const normalized = normalizeSchema(parsed, prompt)
    const enforced = enforcePromptFields(normalized, prompt)
    debug(
      'Final questions',
      (enforced?.questions || []).map((q) => ({id: q.id, title: q.title, type: q.type, required: q.required}))
    )

    return {
      ...enforced,
      meta: {provider: 'groq'}
    }
  } catch (error) {
    debug('AI failed, using fallback', {reason: error.message})
    return {
      ...buildFallbackSchema(prompt),
      meta: {provider: 'local-fallback', reason: error.message}
    }
  }
}