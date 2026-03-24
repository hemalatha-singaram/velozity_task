// Shows all tasks the user can see with filtering by status, priority, due date
// Filters work via URL query params (so they are shareable)

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/axios'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  isOverdue: boolean
  assignedTo: { name: string } | null
  project: { name: string }
}

function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // useSearchParams lets us read AND write URL query params like ?status=DONE&priority=HIGH
  const [searchParams, setSearchParams] = useSearchParams()

  // Read current filter values from the URL
  const statusFilter = searchParams.get('status') || ''
  const priorityFilter = searchParams.get('priority') || ''

  // Reload tasks whenever filters change
  useEffect(() => {
    loadTasks()
  }, [statusFilter, priorityFilter])

  async function loadTasks() {
    setLoading(true)
    try {
      // Build query string from current filters
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter

      const res = await api.get('/tasks', { params })
      setTasks(res.data.tasks)
    } catch (err) {
      console.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  // Update URL when filter changes
  function handleFilterChange(key: string, value: string) {
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams)
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus })
      loadTasks()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update.')
    }
  }

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">All Tasks</h1>
      </div>

      {/* Filters bar - values sync with URL */}
      <div className="filters-bar">
        <select
          value={statusFilter}
          onChange={e => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="DONE">Done</option>
          <option value="OVERDUE">Overdue</option>
        </select>

        <select
          value={priorityFilter}
          onChange={e => handleFilterChange('priority', e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>

        {/* Clear filters button */}
        {(statusFilter || priorityFilter) && (
          <button
            className="btn btn-outline"
            onClick={() => setSearchParams({})}
            style={{ fontSize: 13, padding: '6px 12px' }}
          >
            Clear Filters
          </button>
        )}

        <span style={{ fontSize: 13, color: '#94a3b8', alignSelf: 'center' }}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 20 }}>Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state card">No tasks found.</div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td style={{ fontWeight: 500 }}>{task.title}</td>
                    <td style={{ color: '#64748b' }}>{task.project?.name}</td>
                    <td>{task.assignedTo?.name || '—'}</td>
                    <td>
                      {task.status !== 'OVERDUE' ? (
                        <select
                          className="status-select"
                          value={task.status}
                          onChange={e => handleStatusChange(task.id, e.target.value)}
                        >
                          {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="badge badge-overdue">OVERDUE</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${task.priority.toLowerCase()}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td style={{ color: task.isOverdue ? '#dc2626' : '#1e293b' }}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default TasksPage
