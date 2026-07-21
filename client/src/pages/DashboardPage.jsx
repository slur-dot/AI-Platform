import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ListTodo, Activity, CheckCircle, XCircle } from 'lucide-react';
import apiClient from '../api/client';
import StatusBadge from '../components/StatusBadge';
import TaskForm from '../components/TaskForm';
import './DashboardPage.css';

const DashboardPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const navigate = useNavigate();

  const fetchTasks = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const { data } = await apiClient.get('/tasks?limit=50'); // Just get 50 for now
      setTasks(data.data || []);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks(true);
  }, [fetchTasks]);

  useEffect(() => {
    // Poll for updates if there are running tasks
    const hasRunningTasks = tasks.some(t => t.status === 'running' || t.status === 'pending');
    if (hasRunningTasks) {
      const interval = setInterval(() => {
        fetchTasks(false);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [tasks, fetchTasks]);

  const handleTaskCreated = (newTask) => {
    setShowTaskForm(false);
    setTasks(prev => [newTask, ...prev]);
  };

  const getStats = () => {
    return {
      total: tasks.length,
      running: tasks.filter(t => t.status === 'running' || t.status === 'pending').length,
      success: tasks.filter(t => t.status === 'success').length,
      failed: tasks.filter(t => t.status === 'failed').length
    };
  };

  const stats = getStats();

  return (
    <div className="container dashboard-container fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Your Tasks</h1>
          <p className="dashboard-subtitle">Manage and monitor your text processing tasks.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowTaskForm(true)}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          New Task
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-secondary)' }}>
            <ListTodo size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Tasks</h3>
            <p>{stats.total}</p>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--running)' }}>
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <h3>Active</h3>
            <p>{stats.running}</p>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Successful</h3>
            <p>{stats.success}</p>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Failed</h3>
            <p>{stats.failed}</p>
          </div>
        </div>
      </div>

      <div className="tasks-section card">
        <h2 className="section-title">Recent Tasks</h2>
        
        {loading ? (
          <div className="loading-state">
            <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--card-border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
            <p>Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <ListTodo size={48} />
            </div>
            <h3>No tasks yet</h3>
            <p>Create your first task to get started processing text.</p>
            <button className="btn btn-primary" onClick={() => setShowTaskForm(true)}>
              Create Task
            </button>
          </div>
        ) : (
          <div className="tasks-list">
            {tasks.map((task) => (
              <div 
                key={task._id} 
                className="task-row"
                onClick={() => navigate(`/tasks/${task._id}`)}
              >
                <div className="task-info">
                  <h4>{task.title}</h4>
                  <div className="task-meta">
                    <span className="task-op">{task.operationType.replace('_', ' ')}</span>
                    <span className="task-date">{new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="task-status">
                  <StatusBadge status={task.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showTaskForm && (
        <TaskForm 
          onClose={() => setShowTaskForm(false)} 
          onSuccess={handleTaskCreated}
        />
      )}
    </div>
  );
};

export default DashboardPage;
