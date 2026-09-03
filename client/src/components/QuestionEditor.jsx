export default function QuestionEditor({question, index, onChange, onRemove}) {
  const updateField = (field, value) => {
    onChange({
      ...question,
      [field]: value
    })
  }

  const updateValidation = (field, value) => {
    onChange({
      ...question,
      validation: {
        ...(question.validation || {}),
        [field]: value ? Number(value) : undefined
      }
    })
  }

  const updateOptions = (value) => {
    const options = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({
        label: item,
        value: item.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      }))

    onChange({
      ...question,
      options
    })
  }

  return (
    <div className="question-card">
      <div className="question-card-header">
        <span className="question-index">Q{index + 1}</span>
        <div className="question-card-actions">
          <label className="toggle">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(event) => updateField('required', event.target.checked)}
            />
            Required
          </label>
          <button className="mini-btn danger" type="button" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>

      <input
        className="input"
        value={question.title}
        onChange={(event) => updateField('title', event.target.value)}
        placeholder="Question title"
      />

      <textarea
        className="textarea"
        value={question.description}
        onChange={(event) => updateField('description', event.target.value)}
        placeholder="Helper description"
        rows="2"
      />

      <div className="grid two-col">
        <select className="input" value={question.type} onChange={(event) => updateField('type', event.target.value)}>
          <option value="short_text">Short text</option>
          <option value="long_text">Long text</option>
          <option value="email">Email</option>
          <option value="number">Number</option>
          <option value="select">Select</option>
          <option value="radio">Radio</option>
          <option value="checkbox">Checkbox</option>
          <option value="date">Date</option>
        </select>

        <input
          className="input"
          value={question.placeholder || ''}
          onChange={(event) => updateField('placeholder', event.target.value)}
          placeholder="Placeholder"
        />
      </div>

      {(question.type === 'select' || question.type === 'radio' || question.type === 'checkbox') && (
        <input
          className="input"
          value={question.options.map((option) => option.label).join(', ')}
          onChange={(event) => updateOptions(event.target.value)}
          placeholder="Option 1, Option 2, Option 3"
        />
      )}

      {(question.type === 'short_text' || question.type === 'long_text') && (
        <div className="grid two-col">
          <input
            className="input"
            type="number"
            placeholder="Min length"
            value={question.validation?.minLength || ''}
            onChange={(event) => updateValidation('minLength', event.target.value)}
          />
          <input
            className="input"
            type="number"
            placeholder="Max length"
            value={question.validation?.maxLength || ''}
            onChange={(event) => updateValidation('maxLength', event.target.value)}
          />
        </div>
      )}

      {question.type === 'number' && (
        <div className="grid two-col">
          <input
            className="input"
            type="number"
            placeholder="Min value"
            value={question.validation?.min || ''}
            onChange={(event) => updateValidation('min', event.target.value)}
          />
          <input
            className="input"
            type="number"
            placeholder="Max value"
            value={question.validation?.max || ''}
            onChange={(event) => updateValidation('max', event.target.value)}
          />
        </div>
      )}
    </div>
  )
}