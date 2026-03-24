// Shows one project's tasks + a live activity feed for that project
// THIS is where WebSockets are most visible - task updates appear live

import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import api from '../api/axios'

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  dueDate: string | null
  isOverdue: boolean
  assignedTo: { id: string; name: string } | null
}

interface ActivityLog {
  id: string
  description: string
  createdAt: string
  user: { name: string }
}

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']

function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { socket } = useSocket()

  const [project, setProject] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  // For creating a new task
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [developers, setDevelopers] = useState<any[]>([])
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', assignedToId: '', priority: 'MEDIUM', dueDate: ''
  })
  const [savingTask, setSavingTask] = useState(false)

  useEffect(() => {
    loadProject()
    loadActivityFeed()
  }, [id])

  // Join this project's WebSocket room when we open the page
  useEffect(() => {
    if (!socket || !id) return

    socket.emit('join_project', id)
    console.log('Joined project room:', id)

    // Listen for live task updates
    socket.on('task_updated', (updatedTask: Task) => {
      // Replace the old task with the updated one in our list
      setTasks(prev =>
        prev.map(t => t.id === updatedTask.id ? updatedTask : t)
      )
    })

    // Listen for live activity feed updates
    socket.on('activity_update', (newLog: ActivityLog) => {
      // Add new log to the TOP of the activity list
      setActivityLogs(prev => [newLog, ...prev].slice(0, 20))
    })

    // When we leave this page, leave the room and remove listeners
    return () => {
      socket.emit('leave_project', id)
      socket.off('task_updated')
      socket.off('activity_update')
    }
  }, [socket, id])

  async function loadProject() {
    try {
      const res = await api.get(`/projects/${id}`)
      setProject(res.data.project)
      setTasks(res.data.project.tasks)
    } catch (err) {
      console.error('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  async function loadActivityFeed() {
    try {
      // Get the last 20 activity logs for this project (missed event catchup)
      const res = await api.get('/tasks/feed')
      setActivityLogs(res.data.logs)
    } catch (err) {}
  }

  // When developer changes a task's status via the dropdown
  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus })
      // The WebSocket event 'task_updated' will update the UI automatically
      // But we also update locally as a backup
      setTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
      )
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status.')
    }
  }

  async function openTaskModal() {
    const res = await api.get('/tasks/users')
    setDevelopers(res.data.developers)
    setShowTaskModal(true)
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    setSavingTask(true)
    try {
      await api.post('/tasks', { ...taskForm, projectId: id })
      setShowTaskModal(false)
      setTaskForm({ title: '', description: '', assignedToId: '', priority: 'MEDIUM', dueDate: '' })
      loadProject() // Reload tasks
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create task.')
    } finally {
      setSavingTask(false)
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return new Date(dateStr).toLocaleDateString()
  }

  if (loading) return <div style={{ padding: 20 }}>Loading project...</div>
  if (!project) return <div style={{ padding: 20 }}>Project not found.</div>

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">{project.name}</h1>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Client: {project.client?.name} · PM: {project.pm?.name}
          </div>
        </div>

        {(user?.role === 'ADMIN' || user?.role === 'PM') && (
          <button className="btn btn-primary" onClick={openTaskModal}>
            + Add Task
          </button>
        )}
      </div>

      <div className="grid-2">
        {/* Left: Tasks list */}
        <div className="card">
          <div className="section-title">Tasks ({tasks.length})</div>

          {tasks.length === 0 ? (
            <div className="empty-state">No tasks yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tasks.map(task => (
                <div key={task.id} style={{
                  padding: 14,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: task.isOverdue ? '#fff5f5' : '#fafafa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: 14 }}>{task.title}</strong>
                    <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                  </div>

                  {task.description && (
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{task.description}</div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      {task.assignedTo ? `👤 ${task.assignedTo.name}` : 'Unassigned'}
                      {task.dueDate && ` · Due ${new Date(task.dueDate).toLocaleDateString()}`}
                    </div>

                    {/* Status dropdown - everyone can change status on their own tasks */}
                    {task.status !== 'OVERDUE' ? (
                      <select
                        className="status-select"
                        value={task.status}
                        onChange={e => handleStatusChange(task.id, e.target.value)}
                        disabled={user?.role === 'DEVELOPER' && task.assignedTo?.id !== user.id}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="badge badge-overdue">OVERDUE</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Live Activity Feed */}
        <div className="card">
          <div className="section-title">
            🔴 Live Activity Feed
            <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
              (updates in real time)
            </span>
          </div>

          {activityLogs.length === 0 ? (
            <div className="empty-state">No activity yet.</div>
          ) : (
            <div className="feed-list">
              {activityLogs.map(log => (
                <div key={log.id} className="feed-item">
                  <div className="feed-dot" />
                  <div>
                    <div className="feed-text">{log.description}</div>
                    <div className="feed-time">{timeAgo(log.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add New Task</div>

            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Task Title</label>
                <input
                  placeholder="e.g. Fix login bug"
                  value={taskForm.title}
                  onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Assign To</label>
                <select
                  value={taskForm.assignedToId}
                  onChange={e => setTaskForm(p => ({ ...p, assignedToId: e.target.value }))}
                >
                  <option value="">-- Unassigned --</option>
                  {developers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  value={taskForm.priority}
                  onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label>Due Date (optional)</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={e => setTaskForm(p => ({ ...p, dueDate: e.target.value }))}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowTaskModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingTask}>
                  {savingTask ? 'Saving...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectDetailPage
