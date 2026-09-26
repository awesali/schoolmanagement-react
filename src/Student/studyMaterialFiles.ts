import { API_BASE_URL } from '../config';

export const isUploadedStudyMaterial = (url?: string) => String(url || '').startsWith('upload:');

export async function downloadStudyMaterial(id: number, title: string) {
  const response = await fetch(`${API_BASE_URL}/api/StudyMaterials/${id}/file`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  if (!response.ok) throw new Error('Could not download this material. Please try again.');
  const file = await response.blob();
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  const type = response.headers.get('content-type') || '';
  const extension = type.includes('pdf') ? '.pdf' : type.includes('wordprocessingml') ? '.docx' : type.includes('msword') ? '.doc'
    : type.includes('png') ? '.png' : type.includes('jpeg') ? '.jpg' : '';
  link.download = title.endsWith(extension) ? title : title + extension;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
