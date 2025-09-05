import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Client-side Supabase client
export const createClient = () => createClientComponentClient();

// Server-side Supabase client
export const createServerClient = () => createServerComponentClient({ cookies });

// Database types (you'll need to generate these from your Supabase schema)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          website: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          website?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          website?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      content: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          content: string;
          type: 'article' | 'video' | 'audio' | 'image';
          status: 'draft' | 'published' | 'archived';
          author_id: string;
          created_at: string;
          updated_at: string;
          published_at: string | null;
          views: number;
          likes: number;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          content: string;
          type: 'article' | 'video' | 'audio' | 'image';
          status?: 'draft' | 'published' | 'archived';
          author_id: string;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          views?: number;
          likes?: number;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          content?: string;
          type?: 'article' | 'video' | 'audio' | 'image';
          status?: 'draft' | 'published' | 'archived';
          author_id?: string;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          views?: number;
          likes?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};