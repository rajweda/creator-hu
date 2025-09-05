import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityApi, CreateCommunityRequest } from '../services/communityApi';
import Button from './Button';
import TextInput from './TextInput';

interface CreateCommunityProps {}

const CreateCommunity: React.FC<CreateCommunityProps> = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateCommunityRequest>({
    name: '',
    description: '',
    category: '',
    tags: [],
    isPrivate: false,
    rules: []
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [ruleInput, setRuleInput] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await communityApi.getCommunityCategories();
      setCategories(response.categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleInputChange = (field: keyof CreateCommunityRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (type: 'banner' | 'logo', file: File | null) => {
    if (type === 'banner') {
      setBannerFile(file);
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => setBannerPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setBannerPreview('');
      }
    } else {
      setLogoFile(file);
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => setLogoPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setLogoPreview('');
      }
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      handleInputChange('tags', [...formData.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const addRule = () => {
    if (ruleInput.trim() && !formData.rules?.includes(ruleInput.trim())) {
      handleInputChange('rules', [...(formData.rules || []), ruleInput.trim()]);
      setRuleInput('');
    }
  };

  const removeRule = (ruleToRemove: string) => {
    handleInputChange('rules', formData.rules?.filter(rule => rule !== ruleToRemove) || []);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Community name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Community name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Community name must be less than 50 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.tags.length === 0) {
      newErrors.tags = 'At least one tag is required';
    } else if (formData.tags.length > 10) {
      newErrors.tags = 'Maximum 10 tags allowed';
    }

    if (bannerFile && bannerFile.size > 10 * 1024 * 1024) {
      newErrors.banner = 'Banner image must be less than 10MB';
    }

    if (logoFile && logoFile.size > 5 * 1024 * 1024) {
      newErrors.logo = 'Logo image must be less than 5MB';
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
      // Create community
      const response = await communityApi.createCommunity(formData);
      const communityId = response.community.id;

      // Upload banner if provided
        if (bannerFile) {
          try {
            await communityApi.uploadCommunityMedia(communityId, bannerFile, 'banner');
          } catch (error) {
            console.error('Error uploading banner:', error);
          }
        }
        // Upload logo if provided
        if (logoFile) {
          try {
            await communityApi.uploadCommunityMedia(communityId, logoFile, 'logo');
          } catch (error) {
            console.error('Error uploading logo:', error);
          }
        }

      // Navigate to the new community
      navigate(`/communities/${communityId}`);
    } catch (error: any) {
      console.error('Error creating community:', error);
      setErrors({ submit: error.response?.data?.error || 'Failed to create community' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/communities')}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Communities
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Community</h1>
          <p className="mt-2 text-gray-600">Build a space for people with shared interests</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
            
            {/* Community Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Community Name *
              </label>
              <TextInput
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter community name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what your community is about"
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>{errors.description && <span className="text-red-500">{errors.description}</span>}</span>
                <span>{formData.description.length}/500</span>
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a category</option>
                {categories.map((category) => {
                  // Map technical category names to user-friendly labels
                  const categoryLabels: Record<string, string> = {
                    'ai-tech': 'AI & Tech',
                    'fashion-style': 'Fashion & Style',
                    'entertainment': 'Entertainment',
                    'learning': 'Learning',
                    'fitness-health': 'Fitness & Health',
                    'art-design': 'Art & Design',
                    'business': 'Business',
                    'travel-culture': 'Travel & Culture'
                  };
                  
                  return (
                    <option key={category} value={category}>
                      {categoryLabels[category] || category}
                    </option>
                  );
                })}
              </select>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            {/* Privacy Setting */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={(e) => handleInputChange('isPrivate', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Make this community private (requires approval to join)
                </span>
              </label>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Tags</h2>
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Add Tags * (Help people discover your community)
              </label>
              <div className="flex space-x-2">
                <TextInput
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Enter a tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
                >
                  Add
                </Button>
              </div>
              {errors.tags && <p className="text-red-500 text-sm mt-1">{errors.tags}</p>}
              
              {/* Tag List */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Community Rules */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Community Rules (Optional)</h2>
            <div>
              <label htmlFor="rules" className="block text-sm font-medium text-gray-700 mb-1">
                Add Rules
              </label>
              <div className="flex space-x-2">
                <TextInput
                  id="rules"
                  value={ruleInput}
                  onChange={(e) => setRuleInput(e.target.value)}
                  placeholder="Enter a community rule"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={addRule}
                  className="px-4 py-2 bg-green-600 text-white hover:bg-green-700"
                >
                  Add Rule
                </Button>
              </div>
              
              {/* Rules List */}
              {formData.rules && formData.rules.length > 0 && (
                <div className="space-y-2 mt-3">
                  {formData.rules.map((rule, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 p-3 rounded-md flex items-start justify-between"
                    >
                      <span className="text-sm text-gray-700">
                        {index + 1}. {rule}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRule(rule)}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Media Upload */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Community Images (Optional)</h2>
            
            {/* Banner Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banner Image (Recommended: 1200x300px)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                {bannerPreview ? (
                  <div className="relative">
                    <img
                      src={bannerPreview}
                      alt="Banner preview"
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => handleFileChange('banner', null)}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="mt-4">
                      <label htmlFor="banner-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Upload banner image
                        </span>
                        <input
                          id="banner-upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange('banner', e.target.files?.[0] || null)}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
              {errors.banner && <p className="text-red-500 text-sm mt-1">{errors.banner}</p>}
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo Image (Recommended: 200x200px)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                {logoPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-24 h-24 object-cover rounded-full"
                    />
                    <button
                      type="button"
                      onClick={() => handleFileChange('logo', null)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="mt-4">
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Upload logo image
                        </span>
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange('logo', e.target.files?.[0] || null)}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
              {errors.logo && <p className="text-red-500 text-sm mt-1">{errors.logo}</p>}
            </div>
          </div>

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
                onClick={() => navigate('/communities')}
                className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Community'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCommunity;