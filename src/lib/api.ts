import supabase from './supabase';

export async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiFetch<T = any>(
  path: string,
  options: { method?: string; body?: any; auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth) {
    const token = await getToken();
    if (!token) throw new Error('You are signed out. Please log in again.');
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let data: any = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export type UploadKind = 'artwork' | 'payment' | 'gallery' | 'audio' | 'banner';

export function uploadImage(
  kind: UploadKind,
  file: File,
  auth = false,
  onProgress?: (pct: number) => void
): Promise<{ url?: string; path?: string; bucket?: string }> {
  const isAudio = file.type.startsWith('audio/');
  const max = isAudio ? 15 * 1024 * 1024 : 6 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    if (file.size > max) return reject(new Error(`File too large (max ${isAudio ? '15 MB' : '6 MB'})`));
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = String(reader.result).split(',')[1];
        const token = auth ? await getToken() : null;
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');
        xhr.setRequestHeader('Content-Type', 'application/json');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText || '{}');
            if (xhr.status >= 200 && xhr.status < 300) resolve(data);
            else reject(new Error(data.error || `Upload failed (${xhr.status})`));
          } catch { reject(new Error('Upload failed')); }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(JSON.stringify({ kind, fileName: file.name, fileBase64: base64, contentType: file.type }));
      } catch (e) { reject(e); }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

// Protected purchased-content upload (private `content` bucket, products/<id>/ path).
export function uploadContent(
  productId: number,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ path?: string }> {
  return new Promise((resolve, reject) => {
    if (file.size > 3 * 1024 * 1024) return reject(new Error('Max 3 MB here — host full packs in Google Drive'));
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = String(reader.result).split(',')[1];
        const token = await getToken();
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');
        xhr.setRequestHeader('Content-Type', 'application/json');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText || '{}');
            if (xhr.status >= 200 && xhr.status < 300) resolve(data);
            else reject(new Error(data.error || 'Upload failed'));
          } catch { reject(new Error('Upload failed')); }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(JSON.stringify({ kind: 'content', product_id: productId, fileName: file.name, fileBase64: base64, contentType: file.type }));
      } catch (e) { reject(e); }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

// Extract bucket + storage path from a Supabase public URL (for safe deletion).
export function storagePathFromUrl(url: string): { bucket: string; path: string } | null {
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null;
}

export async function deleteStorageObject(bucket: string, path: string) {
  return apiFetch('/api/upload', { method: 'DELETE', auth: true, body: { bucket, path } });
}
