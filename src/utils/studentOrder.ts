import { classLevel } from './classProgression';

interface SortableStudent { id: number; className?: string; sectionName?: string; rollNumber?: string; studentName: string; }
const compare = (a = '', b = '') => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
export const sortStudentsByClass = <T extends SortableStudent>(students: T[]): T[] => [...students].sort((a, b) => {
  const aLevel = classLevel(a.className), bLevel = classLevel(b.className);
  return (aLevel ?? Number.MAX_SAFE_INTEGER) - (bLevel ?? Number.MAX_SAFE_INTEGER)
    || (aLevel === undefined && bLevel === undefined ? compare(a.className, b.className) : 0)
    || compare(a.sectionName, b.sectionName)
    || Number(!a.rollNumber) - Number(!b.rollNumber)
    || compare(a.rollNumber, b.rollNumber)
    || compare(a.studentName, b.studentName) || a.id - b.id;
});
