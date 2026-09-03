const normalizeQuestion = (question, index) => ({
  id: question?.id || `preview_${index + 1}`,
  title: question?.title || `Untitled question ${index + 1}`,
  description: question?.description || '',
  type: question?.type || 'short_text',
  required: Boolean(question?.required),
  placeholder: question?.placeholder || '',
  options: Array.isArray(question?.options) ? question.options : []
})

const normalizeForm = (form) => {
  if (!form) return null

  return {
    title: form.title || 'Untitled form',
    description: form.description || 'Add a description to introduce this form.',
    status: form.status || 'draft',
    theme: {
      accent: form.theme?.accent || '#ff6b3d',
      surface: form.theme?.surface || '#fff1e8'
    },
    questions: Array.isArray(form.questions) ? form.questions.map(normalizeQuestion) : []
  }
}

function PreviewField({question}) {
  if (question.type === 'long_text') {
    return <textarea className="preview-input preview-textarea" rows="3" placeholder={question.placeholder || 'Long answer'} readOnly />
  }

  if (question.type === 'select') {
    return (
      <div className="preview-input">
        <span>{question.options[0]?.label || 'Select an option'}</span>
      </div>
    )
  }

  if (question.type === 'radio' || question.type === 'checkbox') {
    const options = question.options.length ? question.options : [{label: 'Option 1'}, {label: 'Option 2'}]

    return (
      <div className="preview-choice-list">
        {options.map((option, index) => (
          <label key={`${question.id}_${option.value || index}`} className="preview-choice-item">
            <input type={question.type} readOnly checked={false} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    )
  }

  const placeholders = {
    email: 'Email address',
    number: 'Number response',
    date: 'Pick a date',
    short_text: 'Short answer'
  }

  return <input className="preview-input" type="text" placeholder={question.placeholder || placeholders[question.type] || 'Your answer'} readOnly />
}

export default function FormLivePreview({form}) {
  const preview = normalizeForm(form)

  if (!preview) {
    return (
      <div className="preview-empty-state">
        <strong>No form generated yet</strong>
        <p>Generate a form from a prompt and the live preview will appear here instantly.</p>
      </div>
    )
  }

  return (
    <div className="preview-card" style={{'--preview-accent': preview.theme.accent, '--preview-surface': preview.theme.surface}}>
      <div className="preview-card-head">
        <p className="preview-kicker">{preview.status}</p>
        <span className="preview-question-count">{preview.questions.length} questions</span>
      </div>

      <div className="preview-form-summary">
        <h3>{preview.title}</h3>
        <p>{preview.description}</p>
      </div>

      <div className="preview-form-stage">
        {preview.questions.length ? (
          preview.questions.map((question, index) => (
            <article key={question.id} className="preview-question-card">
              <div className="preview-question-head">
                <span className="preview-step">Q{index + 1}</span>
                {question.required ? <span className="preview-required">Required</span> : null}
              </div>
              <strong>{question.title}</strong>
              {question.description ? <p>{question.description}</p> : null}
              <PreviewField question={question} />
            </article>
          ))
        ) : (
          <div className="preview-empty-state">
            <strong>No questions yet</strong>
            <p>Add questions in the editor and they will show up here right away.</p>
          </div>
        )}
      </div>
    </div>
  )
}