// Dynamic Category Generation Service

interface CategoryData {
  name: string;
  subcategories: string[];
  description: string;
  icon: string;
  color: string;
}

interface RegionData {
  name: string;
  countries: string[];
  timezones: string[];
  languages: string[];
  description: string;
  icon: string;
}

// Enhanced topic categories with dynamic subcategories
const TOPIC_CATEGORIES: Record<string, CategoryData> = {
  'Technology': {
    name: 'Technology',
    subcategories: ['AI & Machine Learning', 'Web Development', 'Mobile Apps', 'Cybersecurity', 'Blockchain', 'Cloud Computing', 'DevOps', 'Data Science', 'IoT', 'Gaming Tech'],
    description: 'Discuss the latest in technology and innovation',
    icon: '💻',
    color: '#3B82F6'
  },
  'Gaming': {
    name: 'Gaming',
    subcategories: ['PC Gaming', 'Console Gaming', 'Mobile Gaming', 'Indie Games', 'Esports', 'Game Development', 'Retro Gaming', 'VR/AR Gaming', 'Streaming', 'Game Reviews'],
    description: 'Connect with fellow gamers and discuss your favorite games',
    icon: '🎮',
    color: '#8B5CF6'
  },
  'Music': {
    name: 'Music',
    subcategories: ['Rock', 'Pop', 'Hip Hop', 'Electronic', 'Classical', 'Jazz', 'Country', 'Indie', 'Music Production', 'Live Concerts'],
    description: 'Share your musical passion and discover new sounds',
    icon: '🎵',
    color: '#EC4899'
  },
  'Movies & TV': {
    name: 'Movies & TV',
    subcategories: ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Documentary', 'Anime', 'TV Series', 'Film Reviews', 'Behind the Scenes'],
    description: 'Discuss your favorite films and TV shows',
    icon: '🎬',
    color: '#F59E0B'
  },
  'Sports': {
    name: 'Sports',
    subcategories: ['Football', 'Basketball', 'Soccer', 'Baseball', 'Tennis', 'Olympics', 'Fitness', 'Extreme Sports', 'Fantasy Sports', 'Sports News'],
    description: 'Talk sports, share highlights, and connect with fans',
    icon: '⚽',
    color: '#10B981'
  },
  'Art & Design': {
    name: 'Art & Design',
    subcategories: ['Digital Art', 'Traditional Art', 'Photography', 'Graphic Design', 'UI/UX Design', 'Architecture', 'Fashion', 'Crafts', 'Art History', 'Tutorials'],
    description: 'Showcase your creativity and get inspired',
    icon: '🎨',
    color: '#EF4444'
  },
  'Science': {
    name: 'Science',
    subcategories: ['Physics', 'Chemistry', 'Biology', 'Astronomy', 'Environmental Science', 'Medicine', 'Psychology', 'Research', 'Science News', 'Experiments'],
    description: 'Explore the wonders of science and discovery',
    icon: '🔬',
    color: '#06B6D4'
  },
  'Business': {
    name: 'Business',
    subcategories: ['Entrepreneurship', 'Marketing', 'Finance', 'Startups', 'Leadership', 'Networking', 'E-commerce', 'Investing', 'Career Advice', 'Industry News'],
    description: 'Network and discuss business strategies',
    icon: '💼',
    color: '#6366F1'
  },
  'Education': {
    name: 'Education',
    subcategories: ['Online Learning', 'Study Tips', 'Academic Research', 'Teaching Methods', 'Educational Technology', 'Language Learning', 'Skill Development', 'Certifications', 'Student Life', 'Career Guidance'],
    description: 'Learn together and share knowledge',
    icon: '📚',
    color: '#84CC16'
  },
  'Lifestyle': {
    name: 'Lifestyle',
    subcategories: ['Health & Wellness', 'Food & Cooking', 'Travel', 'Fashion', 'Home & Garden', 'Relationships', 'Parenting', 'Pets', 'Hobbies', 'Personal Development'],
    description: 'Share life experiences and tips',
    icon: '🌟',
    color: '#F97316'
  }
};

// Enhanced region categories with detailed information
const REGION_CATEGORIES: Record<string, RegionData> = {
  'North America': {
    name: 'North America',
    countries: ['United States', 'Canada', 'Mexico', 'Guatemala', 'Cuba', 'Dominican Republic', 'Haiti', 'Honduras', 'Nicaragua', 'Costa Rica'],
    timezones: ['PST', 'MST', 'CST', 'EST'],
    languages: ['English', 'Spanish', 'French'],
    description: 'Connect with people across North America',
    icon: '🌎'
  },
  'South America': {
    name: 'South America',
    countries: ['Brazil', 'Argentina', 'Chile', 'Peru', 'Colombia', 'Venezuela', 'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay'],
    timezones: ['BRT', 'ART', 'CLT', 'PET'],
    languages: ['Spanish', 'Portuguese', 'English'],
    description: 'Chat with South American communities',
    icon: '🌎'
  },
  'Europe': {
    name: 'Europe',
    countries: ['Germany', 'France', 'United Kingdom', 'Italy', 'Spain', 'Netherlands', 'Poland', 'Sweden', 'Norway', 'Switzerland'],
    timezones: ['GMT', 'CET', 'EET'],
    languages: ['English', 'German', 'French', 'Spanish', 'Italian'],
    description: 'Join European discussions and culture',
    icon: '🇪🇺'
  },
  'Asia': {
    name: 'Asia',
    countries: ['China', 'Japan', 'India', 'South Korea', 'Thailand', 'Singapore', 'Malaysia', 'Philippines', 'Indonesia', 'Vietnam'],
    timezones: ['JST', 'KST', 'IST', 'CST', 'SGT'],
    languages: ['English', 'Mandarin', 'Japanese', 'Korean', 'Hindi'],
    description: 'Connect across diverse Asian cultures',
    icon: '🌏'
  },
  'Africa': {
    name: 'Africa',
    countries: ['South Africa', 'Nigeria', 'Egypt', 'Kenya', 'Morocco', 'Ghana', 'Ethiopia', 'Tanzania', 'Uganda', 'Zimbabwe'],
    timezones: ['CAT', 'EAT', 'WAT', 'SAST'],
    languages: ['English', 'French', 'Arabic', 'Swahili'],
    description: 'Explore African perspectives and culture',
    icon: '🌍'
  },
  'Oceania': {
    name: 'Oceania',
    countries: ['Australia', 'New Zealand', 'Fiji', 'Papua New Guinea', 'Samoa', 'Tonga', 'Vanuatu', 'Solomon Islands'],
    timezones: ['AEST', 'NZST', 'FJT'],
    languages: ['English', 'French', 'Fijian'],
    description: 'Connect with Pacific communities',
    icon: '🏝️'
  },
  'Global': {
    name: 'Global',
    countries: ['International', 'Worldwide', 'Multi-Regional'],
    timezones: ['UTC', 'All Timezones'],
    languages: ['English', 'Multi-Language'],
    description: 'Global discussions for everyone',
    icon: '🌐'
  }
};

export class CategoryService {
  static getTopicCategories(): Record<string, CategoryData> {
    return TOPIC_CATEGORIES;
  }

  static getRegionCategories(): Record<string, RegionData> {
    return REGION_CATEGORIES;
  }

  static getTopicSubcategories(topicName: string): string[] {
    return TOPIC_CATEGORIES[topicName]?.subcategories || [];
  }

  static getRegionCountries(regionName: string): string[] {
    return REGION_CATEGORIES[regionName]?.countries || [];
  }

  static generateRoomName(category: string, subcategory: string): string {
    return `${category} - ${subcategory}`;
  }

  static generateRoomDescription(category: string, subcategory: string, type: 'topic' | 'region'): string {
    if (type === 'topic') {
      return `Discuss ${subcategory} within the ${category} community. Share insights, ask questions, and connect with like-minded individuals.`;
    } else {
      return `Connect with people from ${subcategory} in the ${category} region. Share local insights, cultural experiences, and regional discussions.`;
    }
  }

  static getCategoryColor(categoryName: string): string {
    return TOPIC_CATEGORIES[categoryName]?.color || '#6B7280';
  }

  static getCategoryIcon(categoryName: string, type: 'topic' | 'region'): string {
    if (type === 'topic') {
      return TOPIC_CATEGORIES[categoryName]?.icon || '💬';
    } else {
      return REGION_CATEGORIES[categoryName]?.icon || '🌍';
    }
  }

  static searchCategories(query: string, type: 'topic' | 'region'): string[] {
    const categories = type === 'topic' ? Object.keys(TOPIC_CATEGORIES) : Object.keys(REGION_CATEGORIES);
    return categories.filter(category => 
      category.toLowerCase().includes(query.toLowerCase())
    );
  }

  static getRecommendedCategories(userInterests: string[], type: 'topic' | 'region'): string[] {
    // Simple recommendation based on user interests
    const categories = type === 'topic' ? Object.keys(TOPIC_CATEGORIES) : Object.keys(REGION_CATEGORIES);
    return categories.filter(category => 
      userInterests.some(interest => 
        category.toLowerCase().includes(interest.toLowerCase())
      )
    ).slice(0, 5);
  }
}

export { TOPIC_CATEGORIES, REGION_CATEGORIES };
export type { CategoryData, RegionData };