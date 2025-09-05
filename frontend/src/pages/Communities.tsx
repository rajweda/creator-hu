import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { communityApi, Community } from '../services/communityApi';
import SearchBar from '../components/SearchBar';
import Button from '../components/Button';

interface CommunitiesPageProps {}

const Communities: React.FC<CommunitiesPageProps> = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [trendingCommunities, setTrendingCommunities] = useState<Community[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular' | 'active'>('popular');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadCommunities();
  }, [searchQuery, selectedCategory, sortBy, currentPage]);

  const loadInitialData = async () => {
    try {
      const [trendingResponse, categoriesResponse] = await Promise.all([
        communityApi.getTrendingCommunities(6),
        communityApi.getCommunityCategories()
      ]);
      
      setTrendingCommunities(trendingResponse.communities);
      setCategories(categoriesResponse.categories);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadCommunities = async () => {
    try {
      setLoading(true);
      const response = await communityApi.getCommunities({
        page: currentPage,
        limit: 12,
        search: searchQuery || undefined,
        category: selectedCategory || undefined,
        sort: sortBy
      });
      
      setCommunities(response.data);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Error loading communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: typeof sortBy) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const CommunityCard: React.FC<{ community: Community }> = ({ community }) => (
    <Link
      to={`/communities/${community.id}`}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
    >
      {/* Banner Image */}
      <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
        {community.bannerUrl && (
          <img
            src={community.bannerUrl}
            alt={`${community.name} banner`}
            className="w-full h-full object-cover"
          />
        )}
        {/* Logo */}
        <div className="absolute -bottom-6 left-4">
          <div className="w-12 h-12 bg-white rounded-full border-4 border-white shadow-md flex items-center justify-center">
            {community.logoUrl ? (
              <img
                src={community.logoUrl}
                alt={`${community.name} logo`}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold text-gray-600">
                {community.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
        {/* Privacy Badge */}
        {community.isPrivate && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            Private
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4 pt-8">
        <h3 className="font-bold text-lg text-gray-900 mb-2">{community.name}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{community.description}</p>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {community.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
            >
              #{tag}
            </span>
          ))}
          {community.tags.length > 3 && (
            <span className="text-gray-500 text-xs">+{community.tags.length - 3} more</span>
          )}
        </div>
        
        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
              {community.memberCount}
            </span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              {community.postCount}
            </span>
          </div>
          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
            {community.category}
          </span>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Communities</h1>
              <p className="mt-2 text-gray-600">Discover and join communities that match your interests</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Link to="/communities/create">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Community
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Trending Communities */}
        {trendingCommunities.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Trending Communities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingCommunities.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <SearchBar
                placeholder="Search communities..."
                onSearch={handleSearch}
                className="w-full"
              />
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              
              {/* Sort Filter */}
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="popular">Most Popular</option>
                <option value="active">Most Active</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Communities Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {searchQuery ? `Search Results for "${searchQuery}"` : 'All Communities'}
          </h2>
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="h-32 bg-gray-300"></div>
                  <div className="p-4 pt-8">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded mb-3"></div>
                    <div className="flex space-x-2 mb-3">
                      <div className="h-6 w-12 bg-gray-300 rounded-full"></div>
                      <div className="h-6 w-16 bg-gray-300 rounded-full"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-3 w-16 bg-gray-300 rounded"></div>
                      <div className="h-6 w-20 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : communities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {communities.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No communities found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'Try adjusting your search terms.' : 'Be the first to create a community!'}
              </p>
              {!searchQuery && (
                <div className="mt-6">
                  <Link to="/communities/create">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      Create Community
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2">
            <Button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm"
            >
              Previous
            </Button>
            
            <div className="flex space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, index) => {
                const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + index;
                return (
                  <Button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-2 text-sm ${
                      currentPage === pageNumber
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            
            <Button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Communities;