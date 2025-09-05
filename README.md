# Creator Hub - Next.js 13 Migration

A comprehensive platform for creators to share, monetize, and amplify their content. Built with Next.js 13 App Router, Supabase, and modern web technologies.

## 🚀 Features

- **Community Building**: Live chat, Q&A sessions, and creator groups
- **Monetization**: Paid content, subscriptions, and digital marketplace
- **Content Amplification**: Advanced analytics and cross-platform sharing
- **Modern UI**: Built with Tailwind CSS and Shadcn/ui components
- **Real-time Features**: Live updates with Supabase real-time subscriptions
- **Authentication**: Secure user management with Supabase Auth

## 🛠️ Tech Stack

- **Framework**: Next.js 13 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui + Radix UI
- **Icons**: Lucide React
- **Payment**: Stripe (configured)
- **TypeScript**: Full type safety

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd creator-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase and other service credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Set up Supabase**
   ```bash
   # Install Supabase CLI if you haven't already
   npm install -g supabase
   
   # Initialize Supabase (if not already done)
   supabase init
   
   # Start local Supabase instance
   supabase start
   
   # Apply database migrations
   supabase db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗂️ Project Structure

```
src/
├── app/                    # Next.js 13 App Router
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Protected dashboard area
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Landing page
│   └── providers.tsx      # Context providers
├── components/            # Reusable components
│   ├── ui/               # Base UI components (Shadcn/ui)
│   └── dashboard/        # Dashboard-specific components
├── lib/                  # Utilities and configurations
│   ├── supabase.ts      # Supabase client setup
│   └── utils.ts         # Helper functions
supabase/
├── config.toml           # Supabase configuration
└── migrations/           # Database migrations
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler
- `npm test` - Run tests

## 🔐 Authentication Flow

1. Users can register/login via `/auth/register` and `/auth/login`
2. Authentication state is managed globally via React Context
3. Protected routes automatically redirect to login if not authenticated
4. User profiles are automatically created on signup via database triggers

## 📊 Database Schema

The application includes the following main tables:

- **profiles** - User profile information
- **content** - Creator content (articles, videos, etc.)
- **followers** - User following relationships
- **content_likes** - Content engagement
- **comments** - Content comments
- **subscriptions** - Monetization subscriptions

## 🎨 UI Components

Built with Shadcn/ui components for consistency and accessibility:

- Button, Card, Input, Label
- Alert for notifications
- Navigation components
- Dashboard layout components

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Other Platforms

The app can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🔄 Migration Status

✅ **Completed:**
- Next.js 13 project structure
- App Router implementation
- Supabase integration
- Authentication system
- Basic UI components
- Dashboard layout
- Database schema
- TypeScript configuration
- Tailwind CSS setup

🚧 **Next Steps:**
- Content management system
- Real-time chat features
- Payment integration
- Analytics dashboard
- Mobile responsiveness
- Performance optimization

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.