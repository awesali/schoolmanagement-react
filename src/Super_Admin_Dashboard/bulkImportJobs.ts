export interface BulkImportFailure { rowNumber: number; name: string; email: string; message: string; }
export interface BulkImportJob {
  id: string; type: 'Student' | 'Staff'; status: 'running' | 'completed'; total: number; processed: number; imported: number; errors: BulkImportFailure[]; createdAt: number;
}
let jobs: BulkImportJob[] = [];
const listeners = new Set<(items: BulkImportJob[]) => void>();
const publish = () => listeners.forEach(listener => listener([...jobs]));
export const getBulkImportJobs = () => [...jobs];
export const subscribeBulkImportJobs = (listener: (items: BulkImportJob[]) => void) => { listeners.add(listener); listener([...jobs]); return () => listeners.delete(listener); };
export const startBulkImportJob = (type: 'Student' | 'Staff', total: number) => { const job: BulkImportJob = { id: `${type}-${Date.now()}-${Math.random()}`, type, status: 'running', total, processed: 0, imported: 0, errors: [], createdAt: Date.now() }; jobs = [job, ...jobs].slice(0, 10); publish(); return job.id; };
export const updateBulkImportJob = (id: string, imported: number, errors: BulkImportFailure[], processed: number, completed = false) => { jobs = jobs.map(job => job.id === id ? { ...job, imported, errors: [...errors], processed, status: completed ? 'completed' : 'running' } : job); publish(); };