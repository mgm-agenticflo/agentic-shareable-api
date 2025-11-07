export type APIResponseType<T = unknown> = {
  success: boolean;
  message: string;
  result?: T;
  meta?: object;
};

export type ChatMessage = {
  role: string;
  content: string;
};

export type WebChatHistory = {
  sessionId: string;
  messages: ChatMessage[];
};

export type FileCreateDTO = {
  name: string;
  mime: string;
  hash: string;
  size: number;
  virtualPath?: string;
  source?: string;
};

export type FileConfirmationDTO = {
  key: string;
  size: number;
};

export type FileDTO = {
  name: string;
  mime: string;
  virtualPath: string;
  size: number;
  hash: string | null;
  metadata?: Record<string, unknown>;
};

export type SignedUrl = {
  url: string;
  file: FileDTO;
};
