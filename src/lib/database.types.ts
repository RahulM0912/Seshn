// Typed shape of the Supabase `public` schema — the contract every query/mutation
// in `src/lib/{queries,mutations}.ts` is checked against.
//
// Hand-written to mirror the migrations in `supabase/migrations/` (the source of
// truth). When the Supabase CLI is available this file can be regenerated with:
//   supabase gen types typescript --project-id <ref> --schema public > src/lib/database.types.ts
// Keep it in sync if the SQL changes. `Relationships` are filled in per slice as
// embedded selects are introduced — `sessions → profiles` is wired (the FK behind
// the `select("*, profiles(*)")` author embed the multi-author feed uses in Step
// 6; the single-author profile page attaches the profile itself). Rest stay empty
// until a slice needs them.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Visibility = "public" | "followers" | "private";
export type NotificationType = "like" | "comment" | "follow";

// A visibility filter for the profile owner's own-sessions dropdown: a concrete
// visibility, or "all" (no filter). Owner-only in the UI — for other viewers RLS
// already strips the rows a filter would hide, so the dropdown isn't shown.
export type VisibilityFilter = Visibility | "all";

// Keyset pagination cursor for a session list: the (created_at, id) of the last
// row already shown. The next page is everything strictly older. Round-trips as
// plain JSON to the `loadSessions` server action.
export interface SessionCursor {
  createdAt: string;
  id: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          timezone: string;
          onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          timezone?: string;
          onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          timezone?: string;
          onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          started_at: string;
          ended_at: string;
          focus_minutes: number;
          pomodoros_completed: number;
          pomodoros_planned: number | null;
          subject: string | null;
          caption: string | null;
          visibility: Visibility;
          like_count: number;
          comment_count: number;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          started_at: string;
          ended_at: string;
          focus_minutes: number;
          pomodoros_completed?: number;
          pomodoros_planned?: number | null;
          subject?: string | null;
          caption?: string | null;
          visibility?: Visibility;
          like_count?: number;
          comment_count?: number;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          started_at?: string;
          ended_at?: string;
          focus_minutes?: number;
          pomodoros_completed?: number;
          pomodoros_planned?: number | null;
          subject?: string | null;
          caption?: string | null;
          visibility?: Visibility;
          like_count?: number;
          comment_count?: number;
          deleted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      likes: {
        Row: {
          user_id: string;
          session_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          session_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          session_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      streaks: {
        Row: {
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_session_date: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_session_date?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          current_streak?: number;
          longest_streak?: number;
          last_session_date?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          body: string;
          created_at: string;
          edited_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          body: string;
          created_at?: string;
          edited_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          body?: string;
          created_at?: string;
          edited_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string;
          type: NotificationType;
          session_id: string | null;
          comment_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id: string;
          type: NotificationType;
          session_id?: string | null;
          comment_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          actor_id?: string;
          type?: NotificationType;
          session_id?: string | null;
          comment_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      waitlist: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_daily_focus_minutes: {
        Args: { p_user_id: string };
        Returns: number;
      };
      get_follow_counts: {
        Args: { p_user_id: string };
        Returns: { followers: number; following: number }[];
      };
      get_unread_notification_count: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      get_waitlist_count: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

// --- convenience row aliases ---
type Tables = Database["public"]["Tables"];
export type Profile = Tables["profiles"]["Row"];
export type Session = Tables["sessions"]["Row"];
export type SessionInsert = Tables["sessions"]["Insert"];
export type Comment = Tables["comments"]["Row"];
export type Notification = Tables["notifications"]["Row"];
export type Streak = Tables["streaks"]["Row"];

// A session joined with its author profile — the shape `SessionCard` renders and
// what `select("*, profiles(*)")` returns (sessions → profiles is to-one).
export type SessionWithProfile = Session & { profiles: Profile };

// A comment joined with its author profile (Slice 8 / Step 9). Joined in app code
// via a second `profiles` query, same as the feed — not the PostgREST embed.
export type CommentWithProfile = Comment & { profiles: Profile };

// An inbox notification with its actor's profile + (for `comment` rows) the body
// preview pulled from the referenced comment (Slice 9 / Step 10). `commentBody` is
// null for like/follow rows or when the comment was since soft-deleted.
export type NotificationFeedItem = Notification & {
  actor: Profile;
  commentBody: string | null;
};
