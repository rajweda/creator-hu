import React, { useState, useEffect } from 'react';
import './CreatorVerification.css';

interface VerificationData {
  id: number;
  isVerified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verificationCategory?: string;
  verificationDocuments?: string[];
  verificationSubmittedAt?: string;
  verificationApprovedAt?: string;
  verificationRejectedAt?: string;
  verificationNotes?: string;
}

const VERIFICATION_CATEGORIES = [
  { value: 'education', label: 'Education & Learning', icon: '🎓' },
  { value: 'technology', label: 'Technology & Programming', icon: '💻' },
  { value: 'arts', label: 'Arts & Creative', icon: '🎨' },
  { value: 'business', label: 'Business & Finance', icon: '💼' },
  { value: 'health', label: 'Health & Wellness', icon: '🏥' },
  { value: 'science', label: 'Science & Research', icon: '🔬' },
  { value: 'language', label: 'Language Learning', icon: '🗣️' },
  { value: 'music', label: 'Music & Audio', icon: '🎵' },
  { value: 'cooking', label: 'Cooking & Food', icon: '👨‍🍳' },
  { value: 'fitness', label: 'Fitness & Sports', icon: '💪' }
];

const REQUIRED_DOCUMENTS = {
  education: [
    'Educational qualification certificates',
    'Teaching experience certificates',
    'Professional ID or license (if applicable)',
    'Sample teaching content or portfolio'
  ],
  technology: [
    'Professional certifications',
    'Work experience certificates',
    'Portfolio or GitHub profile',
    'Technical qualification documents'
  ],
  default: [
    'Professional qualification certificates',
    'Work experience documents',
    'Portfolio or sample work',
    'Government-issued ID proof'
  ]
};

const CreatorVerification: React.FC = () => {
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('http://localhost:4000/api/users/verification-status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch verification status');
      }

      const data = await response.json();
      setVerificationData(data);
      
      if (data.verificationCategory) {
        setSelectedCategory(data.verificationCategory);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!validTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Please upload JPG, PNG, or PDF files.`);
        return false;
      }
      
      if (file.size > maxSize) {
        setError(`File too large: ${file.name}. Maximum size is 5MB.`);
        return false;
      }
      
      return true;
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const submitVerification = async () => {
    if (!selectedCategory) {
      setError('Please select a verification category');
      return;
    }

    if (uploadedFiles.length === 0) {
      setError('Please upload at least one verification document');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Upload files first
      const formData = new FormData();
      uploadedFiles.forEach((file, index) => {
        formData.append(`documents`, file);
      });
      formData.append('category', selectedCategory);

      const response = await fetch('http://localhost:4000/api/users/submit-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit verification');
      }

      const result = await response.json();
      setVerificationData(result.verification);
      
      // Clear form
      setUploadedFiles([]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#059669';
      case 'rejected': return '#dc2626';
      case 'pending': return '#d97706';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      default: return '📋';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRequiredDocuments = (category: string) => {
    return REQUIRED_DOCUMENTS[category as keyof typeof REQUIRED_DOCUMENTS] || REQUIRED_DOCUMENTS.default;
  };

  if (loading) {
    return (
      <div className="verification-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading verification status...</p>
        </div>
      </div>
    );
  }

  if (error && !verificationData) {
    return (
      <div className="verification-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Failed to Load Verification Status</h3>
          <p>{error}</p>
          <button className="retry-button" onClick={fetchVerificationStatus}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-container">
      <div className="verification-header">
        <h1>Creator Verification</h1>
        <p>Get verified to build trust with your audience and unlock premium features</p>
      </div>

      {verificationData && verificationData.verificationStatus !== 'pending' && (
        <div className="current-status">
          <div className="status-card">
            <div className="status-header">
              <div className="status-icon">
                {getStatusIcon(verificationData.verificationStatus)}
              </div>
              <div className="status-info">
                <h3>Verification Status</h3>
                <div 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(verificationData.verificationStatus) }}
                >
                  {verificationData.verificationStatus.charAt(0).toUpperCase() + verificationData.verificationStatus.slice(1)}
                </div>
              </div>
            </div>

            {verificationData.verificationCategory && (
              <div className="status-detail">
                <span className="label">Category:</span>
                <span className="value">
                  {VERIFICATION_CATEGORIES.find(c => c.value === verificationData.verificationCategory)?.label || verificationData.verificationCategory}
                </span>
              </div>
            )}

            {verificationData.verificationSubmittedAt && (
              <div className="status-detail">
                <span className="label">Submitted:</span>
                <span className="value">{formatDate(verificationData.verificationSubmittedAt)}</span>
              </div>
            )}

            {verificationData.verificationApprovedAt && (
              <div className="status-detail">
                <span className="label">Approved:</span>
                <span className="value">{formatDate(verificationData.verificationApprovedAt)}</span>
              </div>
            )}

            {verificationData.verificationRejectedAt && (
              <div className="status-detail">
                <span className="label">Rejected:</span>
                <span className="value">{formatDate(verificationData.verificationRejectedAt)}</span>
              </div>
            )}

            {verificationData.verificationNotes && (
              <div className="status-notes">
                <span className="label">Notes:</span>
                <p className="notes-text">{verificationData.verificationNotes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {(!verificationData || verificationData.verificationStatus === 'rejected') && (
        <div className="verification-form">
          <div className="form-section">
            <h3>Select Your Category</h3>
            <p>Choose the category that best represents your content expertise</p>
            
            <div className="categories-grid">
              {VERIFICATION_CATEGORIES.map(category => (
                <div
                  key={category.value}
                  className={`category-card ${selectedCategory === category.value ? 'selected' : ''}`}
                  onClick={() => setSelectedCategory(category.value)}
                >
                  <div className="category-icon">{category.icon}</div>
                  <div className="category-label">{category.label}</div>
                </div>
              ))}
            </div>
          </div>

          {selectedCategory && (
            <div className="form-section">
              <h3>Required Documents</h3>
              <p>Please upload the following documents for verification:</p>
              
              <div className="required-docs">
                {getRequiredDocuments(selectedCategory).map((doc, index) => (
                  <div key={index} className="required-doc">
                    <span className="doc-icon">📄</span>
                    <span className="doc-text">{doc}</span>
                  </div>
                ))}
              </div>

              <div className="upload-section">
                <div className="upload-area">
                  <input
                    type="file"
                    id="document-upload"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileUpload}
                    className="upload-input"
                  />
                  <label htmlFor="document-upload" className="upload-label">
                    <div className="upload-icon">📁</div>
                    <div className="upload-text">
                      <strong>Click to upload documents</strong>
                      <span>or drag and drop files here</span>
                    </div>
                    <div className="upload-hint">
                      Supported formats: JPG, PNG, PDF (max 5MB each)
                    </div>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="uploaded-files">
                    <h4>Uploaded Files ({uploadedFiles.length})</h4>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="uploaded-file">
                        <div className="file-info">
                          <span className="file-icon">
                            {file.type.includes('pdf') ? '📄' : '🖼️'}
                          </span>
                          <div className="file-details">
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                        <button
                          className="remove-file"
                          onClick={() => removeFile(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              className="submit-button"
              onClick={submitVerification}
              disabled={!selectedCategory || uploadedFiles.length === 0 || submitting}
            >
              {submitting ? (
                <>
                  <div className="button-spinner"></div>
                  Submitting...
                </>
              ) : (
                'Submit for Verification'
              )}
            </button>
          </div>
        </div>
      )}

      {verificationData && verificationData.verificationStatus === 'pending' && (
        <div className="pending-state">
          <div className="pending-icon">⏳</div>
          <h3>Verification Under Review</h3>
          <p>Your verification request has been submitted and is currently under review.</p>
          <p>We'll notify you once the review is complete. This usually takes 2-3 business days.</p>
          
          {verificationData.verificationSubmittedAt && (
            <div className="submitted-info">
              <strong>Submitted:</strong> {formatDate(verificationData.verificationSubmittedAt)}
            </div>
          )}
        </div>
      )}

      <div className="verification-benefits">
        <h3>Verification Benefits</h3>
        <div className="benefits-grid">
          <div className="benefit-item">
            <div className="benefit-icon">✅</div>
            <div className="benefit-text">
              <strong>Trust Badge</strong>
              <span>Display verified creator badge on your profile</span>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">🚀</div>
            <div className="benefit-text">
              <strong>Higher Visibility</strong>
              <span>Verified content gets priority in search results</span>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">💰</div>
            <div className="benefit-text">
              <strong>Premium Pricing</strong>
              <span>Set higher prices for your verified content</span>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">📊</div>
            <div className="benefit-text">
              <strong>Analytics</strong>
              <span>Access detailed analytics and insights</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorVerification;