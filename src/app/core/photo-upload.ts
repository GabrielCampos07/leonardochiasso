export const PHOTO_UPLOAD_FAILED = 'Não foi possível enviar a foto.';
export const PHOTO_UPLOAD_RETRY = 'Tentar de novo';

export function isPhotoUploadFailure(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = 'name' in err ? String((err as { name?: string }).name) : '';
  const message = 'message' in err ? String((err as { message?: string }).message) : '';
  return (
    name === 'TypeError' ||
    /failed to fetch|networkerror|cors|upload falhou/i.test(message)
  );
}

export function photoUploadErrorMessage(err: unknown): string {
  return isPhotoUploadFailure(err) ? PHOTO_UPLOAD_FAILED : PHOTO_UPLOAD_FAILED;
}
