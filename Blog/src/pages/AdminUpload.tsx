import BlogBrandHome from '@/components/BlogBrandHome';
import UploadWorkspace from '@/components/upload/UploadWorkspace';
import { usePosts } from '@/hooks/usePosts';
import { useNavigate } from 'react-router';

export default function AdminUpload() {
  const { posts } = usePosts();
  const navigate = useNavigate();
  const categories = [...new Set(posts.map((item) => item.category).filter((value): value is string => Boolean(value)))];
  return <UploadWorkspace target="blog" brand={<BlogBrandHome />} categories={categories} managementHref="/admin/posts" onExisting={(files, category) => {
    const slug = files[0].webkitRelativePath.split('/')[0];
    navigate(`/admin/posts/${encodeURIComponent(slug)}/edit`, { state: { replacement: files, category } });
  }} />;
}
