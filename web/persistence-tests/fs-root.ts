import {fileURLToPath} from 'node:url';

/** Vite's /@fs route needs a slash before a Windows drive as well as POSIX roots. */
export function viteRepositoryPath(absolute: string) {
  return encodeURI('/' + absolute.replaceAll('\\', '/').replace(/^\/+/, '')).replaceAll('#', '%23').replaceAll('?', '%3F');
}

export const repositoryFsRoot = viteRepositoryPath(fileURLToPath(new URL('../../', import.meta.url)));
