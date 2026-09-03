const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const optionSet = (items) => items.map((item) => ({label: item, value: slugify(item)}))

const createQuestion = (id, title, type, overrides = {}) => ({
  id,
  title,
  type,
  description: '',
  required: true,
  placeholder: '',
  options: [],
  validation: {},
  ...overrides
})

const uniqueId = (base, used) => {
  let candidate = base || `field_${used.size + 1}`
  let count = 1
  while (used.has(candidate)) {
    candidate = `${base || 'field'}_${count}`
    count += 1
  }
  used.add(candidate)
  return candidate
}

const looksLikeExplicitFieldPrompt = (prompt) => {
  const text = String(prompt || '').toLowerCase()
  return (
    text.includes('field:') ||
    text.includes('fields:') ||
    /\b(with|including|include|has)\b/.test(text) ||
    /\bfields?\b/.test(text)
  )
}

const extractFieldList = (prompt) => {
  const raw = String(prompt || '')
  const lower = raw.toLowerCase()

  const markers = ['fields:', 'field:', 'with', 'including', 'include', 'has']
  let start = -1
  let marker = null

  for (const item of markers) {
    const idx = lower.indexOf(item)
    if (idx !== -1 && (start === -1 || idx < start)) {
      start = idx
      marker = item
    }
  }

  if (start === -1) return []

  const sliceStart = marker.endsWith(':') ? start + marker.length : start + marker.length
  let segment = raw.slice(sliceStart).trim()

  // Trim common trailing phrases so we don't treat them as fields.
  segment = segment.replace(/^(a|an|the)\s+/i, '')
  segment = segment.replace(/^(fields?|field)\s*:\s*/i, '')
  segment = segment.replace(/\b(form|survey|questionnaire)\b.*$/i, '').trim()

  // Treat punctuation/newlines as separators for field lists instead of cutting the sentence.
  segment = segment.replace(/[\n;]+/g, ', ')
  segment = segment.replace(/[.?!]+/g, ', ')

  // Convert "and" / "&" into commas, then split.
  const candidates = segment
    .replace(/\s*&\s*/g, ', ')
    .replace(/\s+and\s+/gi, ', ')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/^(three|four|five|six|seven|eight|nine|ten)\s+fields?\s*:?/i, '').trim())
    .filter(Boolean)

  // If we only got one candidate and it looks like a simple list of single-word fields
  // (e.g. "name email password"), split it safely.
  if (candidates.length === 1 && !segment.includes(',')) {
    const single = candidates[0]
    const tokens = single.split(/\s+/).filter(Boolean)
    const allow = new Set([
      'name',
      'email',
      'password',
      'age',
      'phone',
      'mobile',
      'number',
      'address',
      'date',
      'dob',
      'gender',
      'city',
      'state',
      'country',
      'zip',
      'pincode',
      'pin',
      'message',
      'comments',
      'comment',
      'feedback',
      'rating'
    ])

    const allAllowed = tokens.length >= 2 && tokens.every((t) => allow.has(t.toLowerCase()))
    if (allAllowed) {
      return tokens
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => t[0].toUpperCase() + t.slice(1))
    }
  }

  // Keep only plausible field labels (avoid long paragraphs).
  return candidates
    .map((value) => value.replace(/^[-•\u2022]\s+/, '').trim())
    .filter((value) => !/^(fields?|field)\s*:?\s*$/i.test(value))
    .filter((value) => value.length > 1 && value.length <= 48)
}

const inferQuestionFromLabel = (label) => {
  const normalized = String(label || '').trim()
  const lower = normalized.toLowerCase()

  const optional = /\(optional\)/i.test(normalized) || /\boptional\b/i.test(lower)
  const cleanLabel = normalized.replace(/\(optional\)/i, '').trim()

  if (/\b(password|passcode|pin)\b/.test(lower)) {
    return {title: cleanLabel, type: 'short_text', placeholder: 'Enter password', required: !optional, validation: {minLength: 6}}
  }

  if (/\b(email|e-mail)\b/.test(lower)) {
    return {title: cleanLabel, type: 'email', placeholder: 'name@example.com', required: !optional}
  }

  if (/\b(dob|date of birth|birth date|birthday|date)\b/.test(lower)) {
    return {title: cleanLabel, type: 'date', placeholder: '', required: !optional}
  }

  if (/\b(phone|mobile|contact)\b/.test(lower) || (/\bnumber\b/.test(lower) && !/\bage\b/.test(lower))) {
    return {title: cleanLabel, type: 'short_text', placeholder: 'Enter phone number', required: !optional}
  }

  if (/\b(age|years?|count|quantity|number of)\b/.test(lower)) {
    return {title: cleanLabel, type: 'number', placeholder: '', required: !optional, validation: {min: 0}}
  }

  if (/\b(address)\b/.test(lower)) {
    return {title: cleanLabel, type: 'long_text', placeholder: '', required: !optional}
  }

  if (/\b(rating|rate|score)\b/.test(lower)) {
    return {
      title: cleanLabel,
      type: 'radio',
      placeholder: '',
      required: !optional,
      options: optionSet(['1', '2', '3', '4', '5'])
    }
  }

  return {title: cleanLabel, type: 'short_text', placeholder: '', required: !optional}
}

const stripLeadingPromptText = (value) => {
  const text = String(value || '').trim()
  if (!text) return ''

  // Allow users who still type "Create a form with ..." to get clean fields.
  const lowered = text.toLowerCase()
  const withIndex = lowered.indexOf(' with ')
  if (withIndex !== -1) {
    return text.slice(withIndex + 6).trim()
  }

  return text
}

export const buildSchemaFromFieldListInput = (prompt) => {
  const raw = String(prompt || '').trim()
  if (!raw) return null

  const cleaned = stripLeadingPromptText(raw)
    .replace(/[\n;]+/g, ',')
    .replace(/\s*&\s*/g, ',')
    .trim()

  if (!cleaned.includes(',') && !/^\s*[-•\u2022]/m.test(cleaned)) {
    return null
  }

  const fields = cleaned
    .split(',')
    .map((item) => item.replace(/^[-•\u2022]\s+/, '').trim())
    .filter(Boolean)

  if (fields.length === 0) return null

  const used = new Set()
  const questions = fields.map((field) => {
    const inferred = inferQuestionFromLabel(field)
    const id = uniqueId(slugify(inferred.title), used)
    return createQuestion(id, inferred.title, inferred.type, {
      required: true,
      placeholder: inferred.placeholder || '',
      options: inferred.options || [],
      validation: inferred.validation || {}
    })
  })

  return {
    title: 'Generated Form',
    description: `Generated from fields: ${fields.join(', ')}`,
    questions
  }
}

export const buildSchemaFromPrompt = (prompt) => {
  if (!looksLikeExplicitFieldPrompt(prompt)) return null

  const fields = extractFieldList(prompt)
  if (fields.length === 0) return null

  const used = new Set()
  const questions = fields.map((field) => {
    const inferred = inferQuestionFromLabel(field)
    const id = uniqueId(slugify(inferred.title), used)
    return createQuestion(id, inferred.title, inferred.type, {
      required: inferred.required,
      placeholder: inferred.placeholder || '',
      options: inferred.options || [],
      validation: inferred.validation || {}
    })
  })

  return {
    title: 'Custom AI Form',
    description: `AI-generated form for: ${prompt}`,
    questions
  }
}

export const buildFallbackSchema = (prompt) => {
  const normalized = prompt.toLowerCase()

  const direct = buildSchemaFromFieldListInput(prompt)
  if (direct) {
    return direct
  }

  const derived = buildSchemaFromPrompt(prompt)
  if (derived) {
    return derived
  }

  if (normalized.includes('contact')) {
    return {
      title: 'Contact Form',
      description: 'Collect contact details and a short message.',
      questions: [
        createQuestion('name', 'What is your name?', 'short_text', {required: true, placeholder: 'Enter your name'}),
        createQuestion('email', 'What is your email?', 'email', {required: true, placeholder: 'name@example.com'}),
        createQuestion('phone', 'What is your phone number?', 'short_text', {required: false, placeholder: 'Enter phone number'}),
        createQuestion('message', 'How can we help you?', 'long_text', {required: true, placeholder: 'Write your message'})
      ]
    }
  }

  if (normalized.includes('registration') || normalized.includes('register') || normalized.includes('sign up') || normalized.includes('signup')) {
    return {
      title: 'Registration Form',
      description: 'Collect basic details to complete registration.',
      questions: [
        createQuestion('full_name', 'Full name', 'short_text', {placeholder: 'Enter full name', validation: {minLength: 2}}),
        createQuestion('email', 'Email address', 'email', {placeholder: 'name@example.com'}),
        createQuestion('age', 'Age', 'number', {required: false, validation: {min: 0}}),
        createQuestion('phone', 'Phone number', 'short_text', {required: false, placeholder: 'Enter phone number'})
      ]
    }
  }

  if (normalized.includes('admission') || normalized.includes('school')) {
    return {
      title: 'School Admission Form',
      description: 'Collect student and guardian details for admission review.',
      questions: [
        createQuestion('student_name', 'Student name', 'short_text', {placeholder: 'Enter student name', validation: {minLength: 2}}),
        createQuestion('student_age', 'Student age', 'number', {validation: {min: 0}}),
        createQuestion('guardian_name', 'Guardian name', 'short_text', {placeholder: 'Enter guardian name', validation: {minLength: 2}}),
        createQuestion('guardian_phone', 'Guardian phone number', 'short_text', {placeholder: 'Enter phone number'}),
        createQuestion('grade', 'Which grade are you applying for?', 'select', {options: optionSet(['KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])}),
        createQuestion('address', 'Address', 'long_text', {required: false})
      ]
    }
  }

  if (normalized.includes('job')) {
    return {
      title: 'Job Application Form',
      description: 'Collect candidate details, experience, and portfolio links.',
      questions: [
        createQuestion('full_name', 'What is your full name?', 'short_text', {
          placeholder: 'Enter your full name',
          validation: {minLength: 2}
        }),
        createQuestion('email', 'What is your email address?', 'email', {
          placeholder: 'name@example.com'
        }),
        createQuestion('phone', 'What is your phone number?', 'short_text', {
          placeholder: '+1 555 123 4567'
        }),
        createQuestion('role', 'Which role are you applying for?', 'select', {
          options: optionSet(['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Designer'])
        }),
        createQuestion('experience', 'How many years of experience do you have?', 'number', {
          validation: {min: 0, max: 30}
        }),
        createQuestion('portfolio', 'Share your portfolio or LinkedIn profile.', 'short_text', {
          required: false,
          placeholder: 'https://'
        }),
        createQuestion('motivation', 'Why do you want to join our team?', 'long_text', {
          placeholder: 'Tell us what excites you about this role',
          validation: {minLength: 30}
        })
      ]
    }
  }

  if (normalized.includes('feedback') || normalized.includes('survey')) {
    return {
      title: 'Customer Feedback Survey',
      description: 'Understand user satisfaction and product improvement areas.',
      questions: [
        createQuestion('name', 'What is your name?', 'short_text', {
          required: false
        }),
        createQuestion('email', 'What is your email?', 'email', {
          required: false
        }),
        createQuestion('rating', 'How would you rate your experience?', 'radio', {
          options: optionSet(['Excellent', 'Good', 'Average', 'Poor'])
        }),
        createQuestion('favorite', 'What did you like most?', 'long_text'),
        createQuestion('improvement', 'What should we improve?', 'long_text', {
          required: false
        }),
        createQuestion('recommend', 'Would you recommend us to a friend?', 'radio', {
          options: optionSet(['Yes', 'No', 'Maybe'])
        })
      ]
    }
  }

  return {
    title: 'Custom AI Form',
    description: `AI-generated form for: ${prompt}`,
    questions: [
      createQuestion('name', 'What is your name?', 'short_text', {
        placeholder: 'Enter your name'
      }),
      createQuestion('email', 'What is your email?', 'email', {
        placeholder: 'name@example.com'
      }),
      createQuestion('details', 'Tell us more.', 'long_text', {
        placeholder: 'Add the information you want to collect'
      })
    ]
  }
}

export const toSlugBase = slugify