import fs from 'fs';

export type FsAPI = Pick<typeof fs, 'existsSync' | 'readFileSync' | 'statSync' | 'realpathSync'>;
