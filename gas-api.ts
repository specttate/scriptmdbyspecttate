export interface GasModerator {
  id: string;
  nick_name: string;
  timezone: string;
  vk: string;
  forum: string;
  tg: string;
  discord: string;
  discord_id: string;
  age: string;
  position: number;
  created_at: string;
  updated_at: string;
}

interface BridgeResponse<T> {
  id: string;
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

export class GasBridgeError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GasBridgeError';
    this.code = code;
  }
}

let requestNumber = 0;
const pending = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
>();

window.addEventListener('message', (event: MessageEvent<BridgeResponse<unknown>>) => {
  if (event.source !== window.parent) return;
  const response = event.data;
  if (!response || !response.id) return;

  const request = pending.get(response.id);
  if (!request) return;
  pending.delete(response.id);

  if (!response.ok) {
    request.reject(
      new GasBridgeError(
        response.error?.code || 'GOOGLE_APPS_SCRIPT_ERROR',
        response.error?.message || 'Операция отклонена Google Apps Script.',
      ),
    );
    return;
  }

  request.resolve(response.data);
});

function request<T>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  if (window.parent === window) {
    return Promise.reject(
      new GasBridgeError(
        'OPENED_DIRECTLY',
        'Откройте приложение по ссылке Google Apps Script.',
      ),
    );
  }

  const id = `request_${Date.now()}_${requestNumber++}`;

  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
    });
    window.parent.postMessage({ id, action, payload }, '*');
  });
}

export const gasApi = {
  list() {
    return request<GasModerator[]>('list');
  },

  assign(data: {
    nickName: string;
    vk: string;
    forum: string;
    tg: string;
    discord: string;
    discordId: string;
    timezone: string;
    age: string;
  }) {
    return request<string>('assign', data);
  },

  changePosition(nickName: string, direction: number) {
    return request<string>('change-position', { nickName, direction });
  },

  dismiss(nickName: string, reason: string) {
    return request<string>('dismiss', { nickName, reason });
  },
};