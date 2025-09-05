import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Content } from "../services/api";
import { useAuth } from "../AuthContext";
import Button from "../components/Button";
import TextInput from "../components/TextInput";
import RichTextEditor from "../components/RichTextEditor";
import ImageUpload from "../components/ImageUpload";

interface ContentFormData {
  title: string;
  body: string;
  images: File[];
}

function Feed() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [formData, setFormData] = useState<ContentFormData>({ title: "", body: "", images: [] });
  const [formLoading, setFormLoading] = useState(false);
  const { user, logout } = useAuth();

  const fetchContents = async () => {
    try {
      setLoading(true);
      const data = await api.getContents();
      setContents(data);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to fetch contents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, []);

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.body.trim()) {
      setError("Title and body are required");
      return;
    }

    setFormLoading(true);
    try {
      await api.createContent({
        title: formData.title.trim(),
        body: formData.body.trim()
      });
      setFormData({ title: "", body: "", images: [] });
      setShowCreateForm(false);
      await fetchContents();
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create content");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContent || !formData.title.trim() || !formData.body.trim()) {
      setError("Title and body are required");
      return;
    }

    setFormLoading(true);
    try {
      await api.updateContent(editingContent.id, {
        title: formData.title.trim(),
        body: formData.body.trim()
      });
      setFormData({ title: "", body: "", images: [] });
      setEditingContent(null);
      await fetchContents();
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to update content");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!window.confirm("Are you sure you want to delete this content?")) {
      return;
    }

    try {
      await api.deleteContent(contentId);
      await fetchContents();
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to delete content");
    }
  };

  const startEdit = (content: Content) => {
    setEditingContent(content);
    setFormData({ title: content.title, body: content.body, images: [] });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingContent(null);
    setFormData({ title: "", body: "", images: [] });
  };

  const startCreate = () => {
    setShowCreateForm(true);
    setEditingContent(null);
    setFormData({ title: "", body: "", images: [] });
  };

  const handleImageUpload = (file: File) => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, file]
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Navigation Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Feed</h1>
          <p className="text-gray-600 mt-1">Discover and manage content</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Creator Studio
            </Button>
          </Link>
          <Link to="/chat">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Chat
            </Button>
          </Link>
          <Button onClick={logout} className="bg-gray-600 hover:bg-gray-700">
            Logout
          </Button>
        </div>
      </div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Feed</h1>
          {user && (
            <p className="text-gray-600 mt-1">Welcome back, {user.displayName || user.name}!</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={startCreate} disabled={showCreateForm || editingContent !== null}>
            Create Content
          </Button>
          <Button onClick={logout} className="bg-gray-600 hover:bg-gray-700">
            Logout
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingContent) && (
        <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingContent ? "Edit Content" : "Create New Content"}
          </h3>
          <form onSubmit={editingContent ? handleUpdateContent : handleCreateContent}>
            <div className="mb-4">
              <TextInput
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Content title"
                disabled={formLoading}
                className="w-full"
              />
            </div>
            <div className="mb-4">
              <RichTextEditor
                value={formData.body}
                onChange={(value) => setFormData(prev => ({ ...prev, body: value }))}
                placeholder="Write your content..."
                disabled={formLoading}
                className="w-full"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Images
              </label>
              <ImageUpload
                onImageUpload={handleImageUpload}
                disabled={formLoading}
                className="mb-2"
              />
              {formData.images.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-2">Uploaded images:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.images.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Upload ${index + 1}`}
                          className="w-20 h-20 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                          disabled={formLoading}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={formLoading}>
                {formLoading ? (editingContent ? "Updating..." : "Creating...") : (editingContent ? "Update" : "Create")}
              </Button>
              <Button 
                type="button" 
                onClick={editingContent ? cancelEdit : () => setShowCreateForm(false)}
                className="bg-gray-600 hover:bg-gray-700"
                disabled={formLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Content List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading contents...</p>
        </div>
      ) : contents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No content available. Create your first post!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contents.map((content) => (
            <div key={content.id} className="bg-white border rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-semibold text-gray-900">{content.title}</h3>
                {user && content.authorId === user.id && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => startEdit(content)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-sm px-3 py-1"
                    >
                      Edit
                    </Button>
                    <Button 
                      onClick={() => handleDeleteContent(content.id)}
                      className="bg-red-600 hover:bg-red-700 text-sm px-3 py-1"
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
              <div 
                className="text-gray-700 mb-3 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: content.body }}
              />
              <div className="text-sm text-gray-500">
                <p>By {content.author?.displayName || content.author?.name || "Unknown"}</p>
                <p>Created: {new Date(content.createdAt).toLocaleDateString()}</p>
                {content.updatedAt !== content.createdAt && (
                  <p>Updated: {new Date(content.updatedAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Feed;