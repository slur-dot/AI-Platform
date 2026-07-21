import React, { useState } from 'react';
import { X, Loader } from 'lucide-react';
import apiClient from '../api/client';
import './TaskForm.css';

const TaskForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    inputText: '',
    operationType: 'uppercase'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.inputText.trim()) {
      setError('Title and input text are required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.post('/tasks', formData);
      onSuccess(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backdrop fade-in">
      <div className="task-form-modal card">
        <div className="task-form-header">
          <h3>Create New Task</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message form-group">{error}</div>}
          
          <div className="form-group">
            <label className="form-label" htmlFor="title">Task Title</label>
            <input
              type="text"
              id="title"
              name="title"
              className="form-control"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Process document text"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="operationType">Operation</label>
            <select
              id="operationType"
              name="operationType"
              className="form-control"
              value={formData.operationType}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="uppercase">Uppercase</option>
              <option value="lowercase">Lowercase</option>
              <option value="reverse">Reverse</option>
              <option value="word_count">Word Count</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="inputText">Input Text</label>
            <textarea
              id="inputText"
              name="inputText"
              className="form-control"
              rows="5"
              value={formData.inputText}
              onChange={handleChange}
              placeholder="Enter text to process..."
              disabled={loading}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="task-form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <Loader size={16} className="spinner" style={{ marginRight: '0.5rem' }} />
                  Creating...
                </>
              ) : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
