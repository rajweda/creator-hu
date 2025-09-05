import React, { useState } from 'react';
import { communityApi, CreatePostRequest, CommunityPost } from '../services/communityApi';
import Button from './Button';
import TextInput from './TextInput';

interface CreatePostProps {
  communityId: number;
  onClose: () => void;
  onPostCreated: (post: CommunityPost) => void;
}

interface PollOption {
  id: string;
  text: string;
}

const CreatePost: React.FC<CreatePostProps> = ({ communityId, onClose, onPostCreated }) => {
  const [formData, setFormData] = useState<CreatePostRequest>({
    title: '',
    content: '',
    type: 'text'
  });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [pollOptions, setPollOptions] = useState<PollOption[]>([{ id: '1', text: '' }, { id: '2', text: '' }]);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollExpiresAt, setPollExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'text' | 'media' | 'poll'>('text');

  const handleInputChange = (field: keyof CreatePostRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).slice(0, 10); // Limit to 10 files
    setMediaFiles(prev => [...prev, ...newFiles].slice(0, 10));
    
    // Generate previews
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreviews(prev => [...prev, e.target?.result as string].slice(0, 10));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addPollOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions(prev => [...prev, { id: Date.now().toString(), text: '' }]);
    }
  };

  const removePollOption = (id: string) => {
    if (pollOptions.length > 2) {
      setPollOptions(prev => prev.filter(option => option.id !== id));
    }
  };

  const updatePollOption = (id: string, text: string) => {
    setPollOptions(prev => prev.map(option => 
      option.id === id ? { ...option, text } : option
    ));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (activeTab === 'text' && !formData.content?.trim()) {
      newErrors.content = 'Content is required for text posts';
    } else if (formData.content && formData.content.length > 10000) {
      newErrors.content = 'Content must be less than 10,000 characters';
    }

    if (activeTab === 'media' && mediaFiles.length === 0) {
      newErrors.media = 'At least one media file is required for media posts';
    }

    if (activeTab === 'poll') {
      if (!pollQuestion.trim()) {
        newErrors.pollQuestion = 'Poll question is required';
      }
      
      const validOptions = pollOptions.filter(option => option.text.trim());
      if (validOptions.length < 2) {
        newErrors.pollOptions = 'At least 2 poll options are required';
      }
    }

    // Validate media file sizes
    const oversizedFiles = mediaFiles.filter(file => file.size > 50 * 1024 * 1024); // 50MB limit
    if (oversizedFiles.length > 0) {
      newErrors.media = 'Some files are too large (max 50MB per file)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Map activeTab to correct post type
      let postType: 'text' | 'image' | 'video' | 'poll' = activeTab === 'media' ? 'image' : activeTab;
      
      // Prepare post data based on type
      let postData: CreatePostRequest = {
        ...formData,
        type: postType
      };

      // Add poll options if it's a poll post
      if (activeTab === 'poll') {
        postData.pollOptions = pollOptions.filter(option => option.text.trim()).map(option => option.text.trim());
      }

      // Create the post
      const response = await communityApi.createPost(communityId, postData);
      let createdPost = response.post;

      // Upload media files if any
      if (mediaFiles.length > 0) {
        try {
          for (const file of mediaFiles) {
            await communityApi.uploadPostMedia(createdPost.id, file);
          }
          // Refresh post data to get media URLs
          const updatedResponse = await communityApi.getCommunityPost(createdPost.id);
          createdPost = updatedResponse.post;
        } catch (error) {
          console.error('Error uploading media:', error);
        }
      }

      onPostCreated(createdPost);
    } catch (error: any) {
      console.error('Error creating post:', error);
      setErrors({ submit: error.response?.data?.error || 'Failed to create post' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Post Type Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {(['text', 'media', 'poll'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'media' ? 'Photo/Video' : tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <TextInput
              id="title"
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter post title"
              className={errors.title ? 'border-red-500' : ''}
            />
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>{errors.title && <span className="text-red-500">{errors.title}</span>}</span>
              <span>{(formData.title || '').length}/200</span>
            </div>
          </div>

          {/* Content based on tab */}
          {activeTab === 'text' && (
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Content *
              </label>
              <textarea
                id="content"
                value={formData.content || ''}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="What's on your mind?"
                rows={8}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  errors.content ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>{errors.content && <span className="text-red-500">{errors.content}</span>}</span>
                <span>{(formData.content || '').length}/10,000</span>
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-4">
              {/* Optional Content */}
              <div>
                <label htmlFor="media-content" className="block text-sm font-medium text-gray-700 mb-1">
                  Caption (Optional)
                </label>
                <textarea
                  id="media-content"
                  value={formData.content || ''}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="Add a caption to your media..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Media * (Max 10 files, 50MB each)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="mt-4">
                      <label htmlFor="media-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Click to upload or drag and drop
                        </span>
                        <span className="block text-xs text-gray-500 mt-1">
                          Images: PNG, JPG, GIF up to 50MB<br/>
                          Videos: MP4, WebM up to 50MB
                        </span>
                        <input
                          id="media-upload"
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={(e) => handleFileChange(e.target.files)}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                </div>
                {errors.media && <p className="text-red-500 text-sm mt-1">{errors.media}</p>}
              </div>

              {/* Media Previews */}
              {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      {mediaFiles[index]?.type.startsWith('video/') ? (
                        <video
                          src={preview}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ) : (
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {(mediaFiles[index]?.size / (1024 * 1024)).toFixed(1)}MB
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'poll' && (
            <div className="space-y-4">
              {/* Optional Content */}
              <div>
                <label htmlFor="poll-content" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="poll-content"
                  value={formData.content || ''}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="Add context to your poll..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Poll Question */}
              <div>
                <label htmlFor="poll-question" className="block text-sm font-medium text-gray-700 mb-1">
                  Poll Question *
                </label>
                <TextInput
                  id="poll-question"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className={errors.pollQuestion ? 'border-red-500' : ''}
                />
                {errors.pollQuestion && <p className="text-red-500 text-sm mt-1">{errors.pollQuestion}</p>}
              </div>

              {/* Poll Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poll Options * (2-10 options)
                </label>
                <div className="space-y-2">
                  {pollOptions.map((option, index) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <TextInput
                        value={option.text}
                        onChange={(e) => updatePollOption(option.id, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePollOption(option.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {errors.pollOptions && <p className="text-red-500 text-sm mt-1">{errors.pollOptions}</p>}
                
                {pollOptions.length < 10 && (
                  <Button
                    type="button"
                    onClick={addPollOption}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Option
                  </Button>
                )}
              </div>

              {/* Poll Expiration */}
              <div>
                <label htmlFor="poll-expires" className="block text-sm font-medium text-gray-700 mb-1">
                  Poll Expires (Optional)
                </label>
                <input
                  id="poll-expires"
                  type="datetime-local"
                  value={pollExpiresAt}
                  onChange={(e) => setPollExpiresAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for polls that never expire
                </p>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-6 border-t">
            {errors.submit && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {errors.submit}
              </div>
            )}
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Post'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;