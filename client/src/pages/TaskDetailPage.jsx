import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Clock, Activity, FileText } from 'lucide-react';
import apiClient from '../api/client';
import StatusBadge from '../components/StatusBadge';
import './TaskDetailPage.css';

const TaskDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTask = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const { data } = await apiClient.get(`/tasks/${id}`);
      setTask(data);
    } catch (err) {
      setError('Failed to load task details');
      console.error(err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTask(true);
  }, [fetchTask]);

  useEffect(() => {
    let interval;
    if (task && (task.status === 'running' || task.status === 'pending')) {
      interval = setInterval(() => {
        fetchTask(false);
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [task, fetchTask]);

  const handleRunTask = async () => {
    setActionLoading(true);
    try {
      const { data } = await apiClient.post(`/tasks/${id}/run`);
      setTask(data.task);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to queue task');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 0', display: 'flex', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--card-border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <div className="error-message">{error || 'Task not found'}</div>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const canRun = task.status === 'pending' || task.status === 'failed';

  return (
    <div className="container task-detail-container fade-in">
      <button className="btn btn-secondary back-btn" onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
        Back to Dashboard
      </button>

      <div className="task-detail-header card">
        <div className="header-main">
          <div className="header-title-group">
            <h1 className="task-title">{task.title}</h1>
            <StatusBadge status={task.status} />
          </div>
          {canRun && (
            <button 
              className="btn btn-primary run-btn" 
              onClick={handleRunTask}
              disabled={actionLoading}
            >
              <Play size={16} style={{ marginRight: '0.5rem' }} />
              Run Task
            </button>
          )}
        </div>
        
        <div className="header-meta">
          <div className="meta-item">
            <Activity size={14} />
            <span>Operation: <strong>{task.operationType.replace('_', ' ')}</strong></span>
          </div>
          <div className="meta-item">
            <Clock size={14} />
            <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
          </div>
          <div className="meta-item">
            <FileText size={14} />
            <span>ID: {task._id}</span>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="content-blocks">
          <div className="card code-card">
            <h3 className="card-title">Input Text</h3>
            <div className="code-block">
              <pre>{task.inputText}</pre>
            </div>
          </div>

          {(task.result || task.status === 'success') && (
            <div className="card code-card fade-in">
              <h3 className="card-title">Result</h3>
              <div className="code-block result-block">
                <pre>{task.result || 'No result returned.'}</pre>
              </div>
            </div>
          )}
        </div>

        <div className="logs-sidebar">
          <div className="card">
            <h3 className="card-title">Execution Logs</h3>
            <div className="logs-container">
              {task.executionLogs && task.executionLogs.length > 0 ? (
                <ul className="logs-list">
                  {task.executionLogs.map((log, index) => (
                    <li key={index} className="log-item">
                      <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="log-msg">{log.message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-logs">No execution logs available yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailPage;
