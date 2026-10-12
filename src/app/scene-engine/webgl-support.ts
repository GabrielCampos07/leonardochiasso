/** Detect WebGL on a *throwaway* canvas so we never bind a context on the scene canvas. */
export function isWebGLAvailable(
  factory: () => Pick<HTMLCanvasElement, 'getContext'> = () => document.createElement('canvas'),
): boolean {
  try {
    const canvas = factory();
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

export function tryCreate<T>(factory: () => T): T | null {
  try {
    return factory();
  } catch {
    return null;
  }
}

export const WEBGL_UNAVAILABLE_TITLE = 'Seu navegador está com o 3D desativado';
export const WEBGL_UNAVAILABLE_HINT =
  'Ative a aceleração de hardware no navegador para ver o ateliê 3D.';
export const WEBGL_UNAVAILABLE_ACTION = 'Voltar para a Lista';
