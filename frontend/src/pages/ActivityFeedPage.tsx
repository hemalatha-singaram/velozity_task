// The global activity feed page
// Shows all recent activity filtered by the user's role
// Also receives real-time updates via WebSocket

import React, { useEffect, useState } from 'react'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

interface ActivityLog {
  id: string
  description: string
  createdAt: string
  user: { name: string }
  task: { title: string }
  project: { name: string }
}

function ActivityFeedPage() {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeed()
  }, [])

  // Listen for live updates from WebSocket
  useEffect(() => {
    if (!socket) return

    socket.on('activity_update', (newLog: ActivityLog) => {
      // Add the new log to the top of the list, keep max 20
      setLogs(prev => [newLog, ...prev].slice(0, 20))
    })

    return () => {
      socket.off('activity_update')
    }
  }, [socket])

  async function loadFeed() {
    try {
      // This endpoint returns last 20 logs filtered by user's role
      const res = await api.get('/tasks/feed')
      setLogs(res.data.logs)
    } catch (err) {
      console.error('Failed to load feed')
    } finally {
      setLoading(false)
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

  const feedDescription = {
    ADMIN: 'Showing all activity across all projects',
    PM: 'Showing activity from your projects only',
    DEVELOPER: 'Showing activity on your assigned tasks only'
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">🔴 Activity Feed</h1>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
            {feedDescription[user?.role as keyof typeof feedDescription]}
            &nbsp;· Updates live via WebSocket
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 20 }}>Loading feed...</div>
      ) : logs.length === 0 ? (
        <div className="empty-state card">No activity yet.</div>
      ) : (
        <div className="card">
          <div className="feed-list">
            {logs.map(log => (
              <div key={log.id} className="feed-item">
                <div className="feed-dot" />
                <div style={{ flex: 1 }}>
                  <div className="feed-text">{log.description}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <span className="feed-time">📁 {log.project?.name}</span>
                    <span className="feed-time">{timeAgo(log.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ActivityFeedPage
