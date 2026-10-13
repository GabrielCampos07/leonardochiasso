import { PHOTO_UPLOAD_FAILED, isPhotoUploadFailure, photoUploadErrorMessage } from './photo-upload';

describe('photo upload errors', () => {
  it('treats CORS / failed PUT as a photo send failure', () => {
    expect(isPhotoUploadFailure(new TypeError('Failed to fetch'))).toBeTrue();
    expect(isPhotoUploadFailure(new Error('Upload falhou (403).'))).toBeTrue();
    expect(photoUploadErrorMessage(new TypeError('Failed to fetch'))).toBe(PHOTO_UPLOAD_FAILED);
  });
});
