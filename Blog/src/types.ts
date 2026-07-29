export interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  aliases?: string[];
  source?: string;
  category?: string;
  summary?: string;
  cover?: string;
}
