import BlogBrandHome from '@/components/BlogBrandHome';
import UploadWorkspace from '@/components/upload/UploadWorkspace';
import { usePosts } from '@/hooks/usePosts';

export default function AdminUpload() {
  const { posts } = usePosts();
  const categories = [...new Set(posts.map((item) => item.category).filter((value): value is string => Boolean(value)))];
  return <UploadWorkspace target="blog" brand={<BlogBrandHome />} categories={categories} />;
}
