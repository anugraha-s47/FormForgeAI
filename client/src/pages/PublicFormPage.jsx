import {useEffect, useMemo, useState} from 'react'
import {useParams} from 'react-router-dom'
import {api} from '../lib/api'

const isEmpty = (value) => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)

export default function PublicFormPage() {
  const {slug} = useParams()
  const [form, setForm] = useState(null)
  const [answers, setAnswers] = useState({})
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getPublicForm(slug)
      .then((data) => {
        setForm(data)
        setStatus('ready')
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [slug])

  const question = form?.questions?.[step]
  const progress = useMemo(() => {
    if (!form?.questions?.length) return 0
    return Math.round(((step + 1) / form.questions.length) * 100)
  }, [form, step])

  const updateAnswer = (questionId, value) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: value
    }))
  }

  const validateCurrent = () => {
    if (question?.required && isEmpty(answers[question.id])) {
      setError('Please answer this question before continuing.')
      return false
    }

    setError('')
    return true
  }

  const handleNext = () => {
    if (!validateCurrent()) return
    setStep((current) => Math.min(current + 1, form.questions.length - 1))
  }

  const handleSubmit = async () => {
    if (!validateCurrent()) return

    try {
      const payload = Object.entries(answers).map(([questionId, value]) => ({questionId, value}))
      await api.submitResponse(slug, payload)
      setStatus('submitted')
    } catch (err) {
      setError(err.message)
    }
  }

  const renderInput = () => {
    const commonProps = {
      className: 'response-input',
      value: answers[question.id] || '',
      onChange: (event) => updateAnswer(question.id, event.target.value),
      placeholder: question.placeholder || ''
    }

    if (question.type === 'long_text') {
      return <textarea {...commonProps} rows="5" />
    }

    if (question.type === 'select') {
      return (
        <select className="response-input" value={answers[question.id] || ''} onChange={(event) => updateAnswer(question.id, event.target.value)}>
          <option value="">Choose one</option>
          {question.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    if (question.type === 'radio') {
      return (
        <div className="choice-grid">
          {question.options.map((option) => (
            <label key={option.value} className="choice-card">
              <input
                type="radio"
                name={question.id}
                checked={answers[question.id] === option.value}
                onChange={() => updateAnswer(question.id, option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )
    }

    if (question.type === 'checkbox') {
      const selected = answers[question.id] || []

      return (
        <div className="choice-grid">
          {question.options.map((option) => (
            <label key={option.value} className="choice-card">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value)
                  updateAnswer(question.id, next)
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )
    }

    const typeMap = {email: 'email', number: 'number', date: 'date', short_text: 'text'}
    return <input {...commonProps} type={typeMap[question.type] || 'text'} />
  }

  if (status === 'loading') {
    return <main className="page centered-page">Loading form...</main>
  }

  if (status === 'error') {
    return <main className="page centered-page error-text">{error}</main>
  }

  if (status === 'submitted') {
    return (
      <main className="public-shell" style={{'--accent': form.theme?.accent || '#ff6b3d', '--surface': form.theme?.surface || '#fff1e8'}}>
        <section className="public-card success-card">
          <span className="eyebrow">Thanks</span>
          <h1>Response received.</h1>
          <p>Your answers are in. This is the kind of calm, focused ending that keeps form experiences feeling polished.</p>
        </section>
      </main>
    )
  }

  if (!form?.questions?.length) {
    return <main className="page centered-page">This form has no questions yet.</main>
  }

  return (
    <main className="public-shell" style={{'--accent': form.theme?.accent || '#ff6b3d', '--surface': form.theme?.surface || '#fff1e8'}}>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{width: `${progress}%`}} />
      </div>

      <section className="public-card">
        <div className="public-topline">
          <span className="eyebrow">{form.title}</span>
          <span className="question-counter">
            {step + 1}/{form.questions.length}
          </span>
        </div>

        <h1>{question.title}</h1>
        {question.description && <p className="question-description">{question.description}</p>}
        <div className="question-stage">{renderInput()}</div>
        {error && <p className="error-text">{error}</p>}

        <div className="question-actions">
          <button className="secondary-btn" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0}>
            Back
          </button>
          {step === form.questions.length - 1 ? (
            <button className="primary-btn" onClick={handleSubmit}>
              Submit
            </button>
          ) : (
            <button className="primary-btn" onClick={handleNext}>
              Next
            </button>
          )}
        </div>
      </section>
    </main>
  )
}