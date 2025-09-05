import React, { useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

interface SearchFilters {
  dateRange?: 'today' | 'week' | 'month' | 'all';
  messageType?: 'all' | 'text' | 'file' | 'image';
  sender?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  onClear, 
  placeholder = "Search messages...",
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: 'all',
    messageType: 'all',
    sender: ''
  });

  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim() || Object.values(filters).some(f => f && f !== 'all')) {
      onSearch(searchQuery.trim(), filters);
    } else {
      onClear?.();
    }
  };

  const handleClear = () => {
    setQuery('');
    setFilters({
      dateRange: 'all',
      messageType: 'all',
      sender: ''
    });
    onClear?.();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (query.length >= 2) {
        handleSearch();
      } else if (query.length === 0 && onClear) {
        onClear();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  return (
    <div className={`search-bar-container ${className}`}>
      <div className="search-input-wrapper">
        <Search className="search-icon" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="search-input"
        />
        {query && (
          <button onClick={handleClear} className="clear-button">
            <X size={16} />
          </button>
        )}
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`filter-button ${showFilters ? 'active' : ''}`}
        >
          <Filter size={16} />
        </button>
      </div>

      {showFilters && (
        <div className="search-filters">
          <div className="filter-group">
            <label>Date Range:</label>
            <select 
              value={filters.dateRange} 
              onChange={(e) => setFilters({...filters, dateRange: e.target.value as any})}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Message Type:</label>
            <select 
              value={filters.messageType} 
              onChange={(e) => setFilters({...filters, messageType: e.target.value as any})}
            >
              <option value="all">All Types</option>
              <option value="text">Text Only</option>
              <option value="file">Files</option>
              <option value="image">Images</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sender:</label>
            <input
              type="text"
              value={filters.sender}
              onChange={(e) => setFilters({...filters, sender: e.target.value})}
              placeholder="Filter by username..."
              className="sender-filter-input"
            />
          </div>

          <div className="filter-actions">
            <button onClick={() => handleSearch()} className="apply-filters-btn">
              Apply Filters
            </button>
            <button onClick={handleClear} className="clear-filters-btn">
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;