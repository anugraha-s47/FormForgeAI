import {useEffect, useMemo, useState} from 'react'
import {Link} from 'react-router-dom'
import QuestionEditor from '../components/QuestionEditor'
import FormLivePreview from '../components/FormLivePreview'
import {useAuth} from '../contexts/AuthContext'
import {api} from '../lib/api'

const starterPrompts = [
  'Full Name, Email, Phone Number, Role, Years of Experience, Portfolio Link, Motivation',
  'Name, Email, Company, Role, City, Feedback',
  'Name, Email, Phone Number, Company Name, Onboarding Feedback, Rating'
]

const manualPromptSuggestions = [
  'Lead with one simple question so completion starts smoothly.',
  'Follow demographic questions with one role-specific branching ask.',
  'Use one multiple-choice question to speed up answers, then a long-text follow-up for context.',
  'Keep optional fields for links, budgets, or scheduling to reduce drop-off.'
]

const themePresets = [
  {name: 'Sunset Bloom', accent: '#ff6b3d', surface: '#fff1e8'},
  {name: 'Ocean Pop', accent: '#1570ef', surface: '#ecf6ff'},
  {name: 'Midnight Lime', accent: '#9be15d', surface: '#121826'}
]

const createEmptyQuestion = (index) => ({
  id: `custom_${Date.now()}_${index}`,
  title: 'New question',
  description: '',
  type: 'short_text',
  required: false,
  placeholder: '',
  options: [],
  validation: {}
})

export default function BuilderPage() {
  const {token, user} = useAuth()
  const [prompt, setPrompt] = useState(starterPrompts[0])
  const [forms, setForms] = useState([])
  const [selectedFormId, setSelectedFormId] = useState('')
  const [meta, setMeta] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [previewForm, setPreviewForm] = useState(null)
  const [view, setView] = useState('generate')
  const [didInitView, setDidInitView] = useState(false)

  useEffect(() => {
    api
      .listForms(token)
      .then((data) => {
        setForms(data)
        if (data[0]) {
          setSelectedFormId(data[0]._id)
        }
      })
      .catch((err) => setError(err.message))
  }, [token])

  const form = useMemo(() => forms.find((item) => item._id === selectedFormId) || null, [forms, selectedFormId])
  const publicFormUrl = form ? `${window.location.origin}/forms/${form.slug}` : ''

  useEffect(() => {
    if (didInitView) return
    setView(form ? 'edit' : 'generate')
    setDidInitView(true)
  }, [didInitView, form])

  useEffect(() => {
    if (!form) {
      setPreviewForm(null)
      return
    }

    setPreviewForm({
      ...form,
      questions: Array.isArray(form.questions) ? form.questions.map((question) => ({...question})) : []
    })
  }, [form])

  const replaceForm = (nextForm) => {
    setForms((current) => {
      const exists = current.some((item) => item._id === nextForm._id)
      const nextItems = exists ? current.map((item) => (item._id === nextForm._id ? nextForm : item)) : [nextForm, ...current]
      return nextItems
    })
    setSelectedFormId(nextForm._id)
  }

  const handleGenerate = async () => {
    try {
      setStatus('loading')
      setError('')
      const data = await api.generateForm(prompt, token)
      replaceForm(data.form)
      setMeta(data.meta)
      setStatus('success')
      setView('edit')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const saveForm = async (nextStatus = form?.status || 'draft') => {
    if (!form) return

    try {
      setStatus('saving')
      const updated = await api.updateForm(
        form._id,
        {
          title: form.title,
          description: form.description,
          questions: form.questions,
          status: nextStatus,
          theme: form.theme
        },
        token
      )
      replaceForm(updated)
      setStatus('saved')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const updateFormField = (field, value) => {
    if (!form) return
    replaceForm({...form, [field]: value})
  }

  const updateQuestion = (index, nextQuestion) => {
    replaceForm({
      ...form,
      questions: form.questions.map((question, questionIndex) => (questionIndex === index ? nextQuestion : question))
    })
  }

  const addQuestion = () => {
    if (!form) return
    replaceForm({
      ...form,
      questions: [...form.questions, createEmptyQuestion(form.questions.length)]
    })
  }

  const removeQuestion = (index) => {
    if (!form) return
    replaceForm({
      ...form,
      questions: form.questions.filter((_, questionIndex) => questionIndex !== index)
    })
  }

  const canEdit = Boolean(form)
  const metaLine = `Forms ${forms.length} | Provider ${meta?.provider || 'ready'} | Status ${form?.status || 'draft'}`

  return (
    <main className="page workspace-page">
      <header className="workspace-top glass-panel">
        <div className="workspace-title">
          <span className="eyebrow">Studio</span>
          <h1>Welcome, {user?.name?.split(' ')[0] || 'Creator'}.</h1>
          <p className="helper-text">Generate, refine, then publish.</p>
        </div>

        <div className="workspace-controls">
          <div className="segmented-control view-tabs compact" role="tablist" aria-label="Workspace views">
            <button
              className={view === 'generate' ? 'segmented active' : 'segmented'}
              type="button"
              onClick={() => setView('generate')}
              role="tab"
              aria-selected={view === 'generate'}
            >
              Generate
            </button>
            <button
              className={view === 'edit' ? 'segmented active' : 'segmented'}
              type="button"
              onClick={() => setView('edit')}
              disabled={!canEdit}
              role="tab"
              aria-selected={view === 'edit'}
            >
              Edit
            </button>
            <button
              className={view === 'preview' ? 'segmented active' : 'segmented'}
              type="button"
              onClick={() => setView('preview')}
              disabled={!canEdit}
              role="tab"
              aria-selected={view === 'preview'}
            >
              Preview
            </button>
          </div>

          <p className="workspace-meta-line">{metaLine}</p>

          <div className="workspace-form-row">
            <select
              className="input"
              value={selectedFormId}
              onChange={(event) => {
                setSelectedFormId(event.target.value)
                setView('edit')
              }}
              disabled={forms.length === 0}
              aria-label="Select a form"
            >
              {forms.length === 0 ? (
                <option value="">No forms yet</option>
              ) : (
                forms.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.title} ({item.status})
                  </option>
                ))
              )}
            </select>

            {view !== 'generate' ? (
              <button className="ghost-btn" type="button" onClick={() => setView('generate')}>
                New prompt
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="workspace-body" role="tabpanel">
        {view === 'generate' ? (
          <section className="workspace-generate">
            <div className="glass-panel generate-panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Prompt</span>
                  <h2>Mention the fields that you want</h2>
                </div>
              </div>

              <div className="panel-body">
                <textarea
                  className="prompt-box"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows="6"
                  placeholder="Name, Email, Phone Number"
                />

                <div className="prompt-help">
                  <p className="helper-text">Enter field names separated by commas.</p>
                  <ul className="prompt-help-list">
                    <li className="helper-text">Example: Name, Email, Phone Number</li>
                    <li className="helper-text">Example: Age, Guardian Name, Guardian Number</li>
                    <li className="helper-text">Example: City, State, Country</li>
                  </ul>
                </div>

                <div className="generate-actions">
                  <button className="primary-btn" type="button" onClick={handleGenerate} disabled={status === 'loading'}>
                    {status === 'loading' ? 'Generating...' : 'Generate'}
                  </button>
                  <p className="helper-text">Tip: keep it short, then refine questions in the editor.</p>
                </div>

                {error && <p className="error-text">{error}</p>}
                {!error && status !== 'idle' && <p className="helper-text">Status: {status}</p>}
              </div>
            </div>

            <aside className="glass-panel generate-library">
              <div className="right-panel-header">
                <div>
                  <span className="eyebrow">Examples</span>
                  <h3>Starter field lists</h3>
                </div>
              </div>

              <div className="prompt-bullet-list compact-list">
                {starterPrompts.map((item, index) => (
                  <button
                    key={item}
                    className={prompt === item ? 'prompt-bullet-card active' : 'prompt-bullet-card'}
                    type="button"
                    onClick={() => setPrompt(item)}
                  >
                    <span className="prompt-bullet-index">{index + 1}</span>
                    <div>
                      <strong>{item}</strong>
                      <p>Click to load.</p>
                    </div>
                  </button>
                ))}
              </div>

              <details className="compact-details">
                <summary className="compact-summary">Prompt suggestions</summary>
                <div className="manual-suggestion-list compact-list">
                  {manualPromptSuggestions.map((item) => (
                    <article key={item} className="manual-suggestion-item">
                      <span className="manual-suggestion-dot" />
                      <p>{item}</p>
                    </article>
                  ))}
                </div>
              </details>
            </aside>
          </section>
        ) : null}

        {view === 'edit' ? (
          form ? (
            <section className="glass-panel editor-panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Editor</span>
                  <h2>Refine questions</h2>
                </div>
                <div className="panel-actions">
                  <button className="secondary-btn" type="button" onClick={() => saveForm('draft')}>
                    Save draft
                  </button>
                  <button className="primary-btn" type="button" onClick={() => saveForm('published')}>
                    Publish
                  </button>
                  {form.status === 'published' ? (
                    <>
                      <Link className="ghost-btn" to={`/forms/${form.slug}`}>
                        Public link
                      </Link>
                      <Link className="ghost-btn" to={`/dashboard/${form._id}`}>
                        Responses
                      </Link>
                    </>
                  ) : (
                    <span className="helper-text">Publish to share and collect responses.</span>
                  )}
                </div>
              </div>

              <div className="panel-body">
                <input className="title-input" value={form.title} onChange={(event) => updateFormField('title', event.target.value)} />
                <textarea
                  className="textarea"
                  rows="3"
                  value={form.description}
                  onChange={(event) => updateFormField('description', event.target.value)}
                />

                <div className="theme-preset-grid">
                  {themePresets.map((preset) => (
                    <button
                      key={preset.name}
                      className="theme-preset-card"
                      type="button"
                      onClick={() => updateFormField('theme', {accent: preset.accent, surface: preset.surface})}
                    >
                      <span className="theme-swatch" style={{background: `linear-gradient(135deg, ${preset.accent}, ${preset.surface})`}} />
                      <strong>{preset.name}</strong>
                    </button>
                  ))}
                </div>

                <div className="question-list">
                  {form.questions.map((question, index) => (
                    <QuestionEditor
                      key={question.id}
                      question={question}
                      index={index}
                      onChange={(nextQuestion) => updateQuestion(index, nextQuestion)}
                      onRemove={() => removeQuestion(index)}
                    />
                  ))}
                </div>

                <button className="ghost-btn add-question-btn" type="button" onClick={addQuestion}>
                  Add question
                </button>
              </div>
            </section>
          ) : (
            <div className="glass-panel empty-state">
              <span className="eyebrow">No form selected</span>
              <h2>Create a form first</h2>
              <p>Switch to Generate and create your first form from a prompt.</p>
              <button className="primary-btn" type="button" onClick={() => setView('generate')}>
                Go to Generate
              </button>
            </div>
          )
        ) : null}

        {view === 'preview' ? (
          form ? (
            <section className="workspace-preview">
              <section className="glass-panel preview-panel">
                <div className="right-panel-header">
                  <div>
                    <span className="eyebrow">Preview</span>
                    <h3>Live preview</h3>
                  </div>
                  {meta?.provider ? <span className="status-pill">{meta.provider}</span> : null}
                </div>

                <FormLivePreview form={previewForm} />

                <div className="preview-actions">
                  <button className="secondary-btn" type="button" onClick={() => saveForm('draft')}>
                    Save draft
                  </button>
                  <button className="primary-btn" type="button" onClick={() => saveForm('published')}>
                    Publish
                  </button>
                </div>

                {form.status === 'published' ? (
                  <div className="link-stack">
                    <Link className="secondary-btn wide-btn" to={`/forms/${form.slug}`}>
                      Open public form
                    </Link>
                    <Link className="secondary-btn wide-btn" to={`/dashboard/${form._id}`}>
                      View responses
                    </Link>
                    <code className="link-preview">{publicFormUrl}</code>
                  </div>
                ) : (
                  <div className="glass-panel inline-callout">
                    <strong>Draft mode</strong>
                    <p className="helper-text">Publish to unlock the share link and response dashboard.</p>
                  </div>
                )}
              </section>
            </section>
          ) : (
            <div className="glass-panel empty-state">
              <span className="eyebrow">No preview</span>
              <h2>Generate a form first</h2>
              <p>Switch to Generate and create a form to see the live preview.</p>
              <button className="primary-btn" type="button" onClick={() => setView('generate')}>
                Go to Generate
              </button>
            </div>
          )
        ) : null}
      </section>
    </main>
  )
}