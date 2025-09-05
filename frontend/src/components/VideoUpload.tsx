import React, { useState } from 'react';
import Button from './Button';
import TextInput from './TextInput';

interface VideoUploadProps {
  onUploadComplete?: (videoData: any) => void;
}

interface YouTubeMetadata {
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [metadata, setMetadata] = useState<YouTubeMetadata | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('10');
  const [category, setCategory] = useState('technology');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  const categories = [
    'technology',
    'food science',
    'programming',
    'youtube growth strategies',
    'mobile tech reviews',
    'blogging'
  ];

  // Extract YouTube video ID from various URL formats
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  // Validate YouTube URL
  const validateYouTubeUrl = (url: string): boolean => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Please enter a valid YouTube URL');
      return false;
    }
    return true;
  };

  // Fetch YouTube metadata
  const fetchYouTubeMetadata = async (url: string) => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Invalid YouTube URL');
      return;
    }

    setIsFetchingMetadata(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:4000/api/videos/youtube-metadata?videoId=${videoId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch video metadata');
      }

      const data = await response.json();
      setMetadata(data);
      setTitle(data.title);
      setDescription(data.description);
      
      // Auto-generate tags from title and description
      const autoTags = data.title.toLowerCase()
        .split(' ')
        .filter((word: string) => word.length > 3)
        .slice(0, 5)
        .join(', ');
      setTags(autoTags);
      
    } catch (err) {
      setError('Failed to fetch video metadata. Please check the URL and try again.');
      setMetadata(null);
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setYoutubeUrl(url);
    setError('');
    
    // Clear previous metadata when URL changes
    if (metadata) {
      setMetadata(null);
      setTitle('');
      setDescription('');
      setTags('');
    }
  };

  const handleFetchMetadata = () => {
    if (validateYouTubeUrl(youtubeUrl)) {
      fetchYouTubeMetadata(youtubeUrl);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (value >= 10 && value <= 50) {
      setPrice(e.target.value);
      setError('');
    } else {
      setError('Price must be between ₹10 and ₹50');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!youtubeUrl) {
      setError('Please enter a YouTube URL');
      return;
    }
    
    if (!validateYouTubeUrl(youtubeUrl)) {
      return;
    }
    
    if (!title.trim()) {
      setError('Please enter a video title');
      return;
    }
    
    const priceValue = parseFloat(price);
    if (priceValue < 10 || priceValue > 50) {
      setError('Price must be between ₹10 and ₹50');
      return;
    }

    setIsUploading(true);
    setError('');
    
    try {
      const videoId = extractVideoId(youtubeUrl);
      const requestData = {
        youtubeUrl,
        videoId,
        title,
        description,
        price: parseFloat(price),
        category,
        tags,
        thumbnail: metadata?.thumbnail || '',
        duration: metadata?.duration || '',
        channelTitle: metadata?.channelTitle || ''
      };

      const response = await fetch('http://localhost:4000/api/videos/upload-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Reset form
      setYoutubeUrl('');
      setMetadata(null);
      setTitle('');
      setDescription('');
      setPrice('10');
      setCategory('technology');
      setTags('');
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }
      
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload Educational Video</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* YouTube URL Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            YouTube Video URL *
          </label>
          <div className="flex gap-2">
            <TextInput
              value={youtubeUrl}
              onChange={handleUrlChange}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1"
              required
            />
            <Button
              type="button"
              onClick={handleFetchMetadata}
              disabled={!youtubeUrl || isFetchingMetadata}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 px-4"
            >
              {isFetchingMetadata ? 'Fetching...' : 'Fetch Info'}
            </Button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...
          </p>
        </div>

        {/* Metadata Preview */}
        {metadata && (
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Video Preview</h3>
            <div className="flex gap-4">
              <img 
                src={metadata.thumbnail} 
                alt="Video thumbnail" 
                className="w-32 h-24 object-cover rounded"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{metadata.title}</p>
                <p className="text-sm text-gray-600 mt-1">Channel: {metadata.channelTitle}</p>
                <p className="text-sm text-gray-600">Duration: {metadata.duration}</p>
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            className="w-full"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter video description"
            rows={4}
            className="w-full border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price (₹10 - ₹50) *
          </label>
          <TextInput
            type="number"
            value={price}
            onChange={handlePriceChange}
            min="10"
            max="50"
            step="0.01"
            className="w-full"
            required
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags (comma-separated)
          </label>
          <TextInput
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., tutorial, beginner, javascript"
            className="w-full"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isUploading || !youtubeUrl || !title.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isUploading ? 'Uploading...' : 'Upload Video'}
        </Button>
      </form>
    </div>
  );
};

export default VideoUpload;