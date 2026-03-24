// The main page layout: sidebar on the left, content on the right
// Also contains the notification bell that updates in real time

import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import api from '../api/axios'

interface Notification {
  id: string
  message: string
  isRead: boolean
  createdAt: string
}

function Layout() {
  const { user, logout } = useAuth()
  const { socket } = useSocket()
  const navigate = useNavigate()

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  // How many are unread (shown as a red badge number)
  const unreadCount = notifications.filter(n => !n.isRead).length

  // Load notifications when page first opens
  useEffect(() => {
    fetchNotifications()
  }, [])

  // Listen for real-time notifications via WebSocket
  useEffect(() => {
    if (!socket) return

    // When server sends a new notification, add it to the top of the list
    socket.on('new_notification', (newNotif: Notification) => {
      setNotifications(prev => [newNotif, ...prev])
    })

    // Cleanup: remove listener when component unmounts
    return () => {
      socket.off('new_notification')
    }
  }, [socket])

  async function fetchNotifications() {
    try {
      const res = await api.get('/notifications')
      setNotifications(res.data.notifications)
    } catch (err) {
      console.error('Failed to load notifications')
    }
  }

  async function markAsRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      )
    } catch (err) {}
  }

  async function markAllRead() {
    try {
      await api.patch('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (err) {}
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  // Format time like "2 mins ago"
  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">⚡ Velozity</div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            📊 Dashboard
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            📁 Projects
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            ✅ Tasks
          </NavLink>
          <NavLink
            to="/activity"
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            📡 Activity Feed
          </NavLink>
        </nav>

        {/* User info at the bottom of sidebar */}
        <div className="sidebar-bottom">
          <div className="sidebar-user-name">{user?.name}</div>
          <div className="sidebar-role-badge">{user?.role}</div>
          <br />
          <button className="logout-btn" onClick={handleLogout}>
            → Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="main-content">
        {/* Top bar with notification bell */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <div className="notif-wrapper">
            <button className="notif-btn" onClick={() => setShowDropdown(prev => !prev)}>
              🔔
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount}</span>
              )}
            </button>

            {/* Notification dropdown */}
            {showDropdown && (
              <div className="notif-dropdown">
                <div className="notif-header">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 12 }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 10).map(notif => (
                    <div
                      key={notif.id}
                      className={`notif-item ${!notif.isRead ? 'unread' : ''}`}
                      onClick={() => markAsRead(notif.id)}
                    >
                      <div className="notif-msg">{notif.message}</div>
                      <div className="notif-time">{timeAgo(notif.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* This is where child pages render */}
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
