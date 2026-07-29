import notesData from '@/generated/notes.json';
import type { Note } from '@/types';

const notes: Note[] = notesData as Note[];

export function useNotes() {
  return {
    notes,
    isLoading: false,
  };
}
