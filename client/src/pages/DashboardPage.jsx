import {useEffect, useMemo, useState} from 'react'
import {useParams} from 'react-router-dom'
import {useAuth} from '../contexts/AuthContext'
import {api} from '../lib/api'

export default function DashboardPage() {
  const {id} = useParams()
  const {token} = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getDashboard(id, token)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [id, token])

  const completionRate = useMemo(() => {
    if (!data) return 0
    return Math.min(100, data.summary.totalResponses * 12)
  }, [data])

  if (error) {
    return <main className="page centered-page error-text">{error}</main>
  }

  if (!data) {
    return <main className="page centered-page">Loading dashboard...</main>
  }

  return (
    <main className="page dashboard-page">
      <section className="dashboard-hero glass-panel">
        <div className="dashboard-hero-copy">
          <span className="eyebrow">Responses</span>
          <h1>{data.form.title}</h1>
          <p>{data.form.description}</p>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <strong>{data.summary.totalResponses}</strong>
            <span>Total responses</span>
          </article>
          <article className="stat-card">
            <strong>{data.summary.questionCount}</strong>
            <span>Questions live</span>
          </article>
          <article className="stat-card">
            <strong>{data.summary.published ? 'Published' : 'Draft'}</strong>
            <span>Current status</span>
          </article>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="glass-panel insight-panel">
          <span className="eyebrow">Momentum</span>
          <h2>Response activity</h2>
          <div className="meter">
            <div className="meter-fill" style={{width: `${completionRate}%`}} />
          </div>
          <p className="helper-text">A lightweight activity indicator based on recent submissions.</p>
        </article>

        <article className="glass-panel response-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Latest answers</span>
              <h2>Recent submissions</h2>
            </div>
          </div>

          <div className="responses-table">
            {data.latestResponses.length === 0 ? (
              <p className="helper-text">No responses yet. Share the published form to start collecting them.</p>
            ) : (
              data.latestResponses.map((response) => (
                <article key={response._id} className="response-row">
                  <div className="response-meta">
                    <strong>{new Date(response.submittedAt).toLocaleString()}</strong>
                  </div>
                  <div className="answer-stack">
                    {response.answers.map((answer) => {
                      const question = data.form.questions.find((item) => item.id === answer.questionId)
                      const value = Array.isArray(answer.value) ? answer.value.join(', ') : answer.value

                      return (
                        <div key={`${response._id}-${answer.questionId}`} className="answer-item">
                          <span>{question?.title || answer.questionId}</span>
                          <strong>{String(value)}</strong>
                        </div>
                      )
                    })}
                  </div>
                </article>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  )
}