// The dashboard - shows different stats depending on who is logged in

import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await api.get('/dashboard')
        setStats(res.data)
      } catch (err) {
        console.error('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  if (loading) return <div style={{ padding: 20 }}>Loading dashboard...</div>
  if (!stats) return <div style={{ padding: 20 }}>Failed to load data.</div>

  // -------- ADMIN DASHBOARD --------
  if (user?.role === 'ADMIN') {
    // Turn groupBy result into a readable map
    const statusMap: Record<string, number> = {}
    stats.tasksByStatus?.forEach((s: any) => {
      statusMap[s.status] = s._count.status
    })

    return (
      <div>
        <div className="topbar">
          <h1 className="page-title">Admin Dashboard</h1>
        </div>

        {/* Stats row */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Total Projects</div>
            <div className="stat-value">{stats.totalProjects}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{stats.totalUsers}</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
            <div className="stat-label">Overdue Tasks</div>
            <div className="stat-value" style={{ color: '#dc2626' }}>{stats.overdueCount}</div>
          </div>
        </div>

        {/* Tasks by status */}
        <div className="card">
          <div className="section-title">Tasks by Status</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'OVERDUE'].map(s => (
              <div key={s} style={{ textAlign: 'center', minWidth: 90 }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{statusMap[s] || 0}</div>
                <span className={`badge badge-${s.toLowerCase()}`}>{s.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // -------- PM DASHBOARD --------
  if (user?.role === 'PM') {
    return (
      <div>
        <div className="topbar">
          <h1 className="page-title">Project Manager Dashboard</h1>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">My Projects</div>
            <div className="stat-value">{stats.totalProjects}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Due This Week</div>
            <div className="stat-value">{stats.dueSoon?.length || 0}</div>
          </div>
        </div>

        {/* Tasks due soon */}
        <div className="card">
          <div className="section-title">Upcoming Due Dates This Week</div>
          {stats.dueSoon?.length === 0 ? (
            <div className="empty-state">No tasks due this week 🎉</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Assigned To</th>
                    <th>Due Date</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.dueSoon?.map((task: any) => (
                    <tr key={task.id}>
                      <td>{task.title}</td>
                      <td>{task.project?.name}</td>
                      <td>{task.assignedTo?.name || '—'}</td>
                      <td>{new Date(task.dueDate).toLocaleDateString()}</td>
                      <td><span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // -------- DEVELOPER DASHBOARD --------
  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">My Dashboard</h1>
      </div>

      <div className="stat-grid">
        {stats.tasksByStatus?.map((s: any) => (
          <div key={s.status} className="stat-card">
            <div className="stat-label">{s.status.replace('_', ' ')}</div>
            <div className="stat-value">{s._count.status}</div>
          </div>
        ))}
      </div>

      {/* My tasks list */}
      <div className="card">
        <div className="section-title">My Tasks (sorted by priority)</div>
        {stats.myTasks?.length === 0 ? (
          <div className="empty-state">No tasks assigned to you yet</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.myTasks?.map((task: any) => (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>{task.project?.name}</td>
                    <td><span className={`badge badge-${task.status.toLowerCase()}`}>{task.status.replace('_', ' ')}</span></td>
                    <td><span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span></td>
                    <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
