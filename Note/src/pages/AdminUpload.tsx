import NoteBrandHome from '@/components/NoteBrandHome';
import UploadWorkspace from '@/components/upload/UploadWorkspace';
import { useNotes } from '@/hooks/useNotes';

export default function AdminUpload() {
  const { notes } = useNotes();
  const categories = [...new Set(notes.map((item) => item.category).filter((value): value is string => Boolean(value)))];
  return <UploadWorkspace target="note" brand={<NoteBrandHome />} categories={categories} />;
}
