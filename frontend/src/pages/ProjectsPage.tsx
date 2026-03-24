// Shows all projects the user can see
// Admin and PM can create new projects

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

interface Project {
  id: string
  name: string
  description: string
  client: { name: string }
  pm: { name: string }
  tasks: any[]
  createdAt: string
}

function ProjectsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // For the "create project" modal
  const [showModal, setShowModal] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', description: '', clientId: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const res = await api.get('/projects')
      setProjects(res.data.projects)
    } catch (err) {
      console.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  async function openCreateModal() {
    // Load clients for the dropdown
    const res = await api.get('/projects/clients')
    setClients(res.data.clients)
    setShowModal(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (!form.name || !form.clientId) {
      setFormError('Project name and client are required.')
      return
    }

    setSaving(true)
    try {
      await api.post('/projects', form)
      setShowModal(false)
      setForm({ name: '', description: '', clientId: '' })
      loadProjects() // Reload list
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create project.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading projects...</div>

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">Projects</h1>

        {/* Only Admin and PM can create projects */}
        {(user?.role === 'ADMIN' || user?.role === 'PM') && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="empty-state card">No projects found.</div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {projects.map(project => {
            const doneTasks = project.tasks.filter(t => t.status === 'DONE').length
            const totalTasks = project.tasks.length

            return (
              <div
                key={project.id}
                className="card"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{project.name}</div>
                    {project.description && (
                      <div style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>{project.description}</div>
                    )}
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      Client: <strong>{project.client?.name}</strong> &nbsp;·&nbsp;
                      PM: <strong>{project.pm?.name}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      {doneTasks} / {totalTasks} tasks done
                    </div>
                    {/* Simple progress bar */}
                    <div style={{ width: 120, height: 6, background: '#e2e8f0', borderRadius: 99, marginTop: 6 }}>
                      <div style={{
                        width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%`,
                        height: '100%',
                        background: '#7c3aed',
                        borderRadius: 99
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Create New Project</div>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Project Name</label>
                <input
                  placeholder="e.g. TechCorp Website Redesign"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  rows={3}
                  placeholder="Brief description..."
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Client</label>
                <select
                  value={form.clientId}
                  onChange={e => setForm(prev => ({ ...prev, clientId: e.target.value }))}
                >
                  <option value="">-- Select Client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {formError && <div className="error-text">{formError}</div>}

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectsPage
