import { Logging } from 'homebridge';
import { DeviceConfig } from '../../config.js';
import * as crypto from 'crypto';

export abstract class EcoFlowApiBase {
  private readonly apiUrl = 'https://api-e.ecoflow.com';

  constructor(protected config: DeviceConfig, protected log: Logging) {
  }

  protected async execute<TResponse>(relativeUrl: string, method: string, data: object): Promise<TResponse> {
    const url = new URL(relativeUrl, this.apiUrl);
    const accessKey = this.config.accessKey;
    const nonce = this.getNonce();
    const timestamp = Date.now();
    const paramsMessage = this.composeSignMessage(data);
    const params = paramsMessage ? `${paramsMessage}&` : '';
    const message = `${params}accessKey=${accessKey}&nonce=${nonce}&timestamp=${timestamp}`;

    const options: RequestInit = {
      method,
      body: JSON.stringify(data),
      headers: new Headers({
        accessKey,
        nonce,
        timestamp: timestamp.toString(),
        sign: this.createHmacSha256(this.config.secretKey, message),
        'Content-Type': 'application/json',
      }),
    };
    try {
      const res = await fetch(url, options);
      return res.json() as TResponse;
    } catch (e) {
      this.log.error('Request is failed:', e);
      throw e;
    }
  }

  private getNonce(): string {
    const min = 0;
    const max = 999999;
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomNumber.toString().padStart(6, '0');
  }

  private composeSignMessage(obj: BodyParams | null, prefix: string = ''): string {
    if (!obj) {
      return '';
    }
    const queryParts: string[] = [];

    Object.keys(obj)
      .sort()
      .forEach(key => {
        const value = obj[key];
        const encodedKey = prefix ? `${prefix}.${key}` : key;

        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            queryParts.push(`${encodedKey}[${index}]=${item}`);
          });
        } else if (typeof value === 'object' && value !== null) {
          // Recursively handle nested objects
          queryParts.push(this.composeSignMessage(value, encodedKey));
        } else {
          // Handle primitive values
          queryParts.push(`${encodedKey}=${value}`);
        }
      });

    return queryParts.join('&');
  }

  private createHmacSha256(key: string, message: string): string {
    return crypto.createHmac('sha256', key)
      .update(message)
      .digest('hex');
  }
}

interface BodyParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}