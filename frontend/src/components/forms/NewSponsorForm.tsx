import React, { useState } from 'react';
import '../../styles/admin/Forms.css';

interface NewSponsorFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const NewSponsorForm = ({ onSubmit, onCancel }: NewSponsorFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    date_of_birth: '',
    status: 'active',
    is_verified: false,
    role: 'sponsor'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-contents">
        <div className="modal-header">
          <h2>New Sponsor</h2>
          <button className="close-button" onClick={onCancel}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-group">
            <label>Full Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter full name"
            />
          </div>

          {/* Standard user fields */}
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter email address"
            />
          </div>

          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Enter username"
            />
          </div>

          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter password"
            />
          </div>

          <div className="form-group">
            <label>Phone:</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
            />
          </div>

          <div className="form-group">
            <label>Date of Birth:</label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              placeholder="Enter date of birth"
            />
          </div>

          <div className="form-group">
            <label>Status:</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="form-group checkboxes">
            <label>
              <input
                type="checkbox"
                name="is_verified"
                checked={formData.is_verified}
                onChange={handleChange}
              />
              Verified
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">Create Sponsor</button>
            <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewSponsorForm;
