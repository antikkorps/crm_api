export interface FileWithData {
  size: number;
  path: string;
  name: string;
  type: string;
  mtime: Date;
  mimetype: string;
  data: Buffer;
}