export type ShareableContext = {
  token: string;
  type: string;
  id: string;
  channels?: string[];
  [key: string]: any;
};
