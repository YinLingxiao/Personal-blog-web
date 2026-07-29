import postsData from '@/generated/posts.json';
import type { Post } from '@/types';

const posts: Post[] = postsData as Post[];

export function usePosts() {
  return {
    posts,
    isLoading: false,
  };
}
