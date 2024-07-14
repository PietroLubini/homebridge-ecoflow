import { Logging } from 'homebridge';
import { DeviceConfig } from '../../config.js';
import * as crypto from 'crypto';

interface CmdResponseBase {
  code: string;
  message: string;
}

export interface CmdResponse<TData> extends CmdResponseBase {
  code: string;
  message: string;
  data: TData;
}

export abstract class EcoFlowApiBase {
  private readonly apiUrl = 'https://api-e.ecoflow.com';

  constructor(protected config: DeviceConfig, protected log: Logging) {}

  protected async execute<TResponse extends CmdResponseBase>(
    relativeUrl: string,
    method: string,
    data: object | null = null
  ): Promise<TResponse> {
    const url = new URL(relativeUrl, this.apiUrl);
    const accessKey = this.config.accessKey;
    const nonce = this.getNonce();
    const timestamp = Date.now();
    const paramsMessage = this.composeSignMessage(data);
    const params = paramsMessage ? `${paramsMessage}&` : '';
    const message = `${params}accessKey=${accessKey}&nonce=${nonce}&timestamp=${timestamp}`;

    const options: RequestInit = {
      method,
      headers: new Headers({
        accessKey,
        nonce,
        timestamp: timestamp.toString(),
        sign: this.createHmacSha256(this.config.secretKey, message),
        'Content-Type': 'application/json',
      }),
    };
    if (data) {
      options.body = JSON.stringify(data);
    }
    try {
      const response = await fetch(url, options);
      const result = (await response.json()) as unknown as TResponse;
      if (result.code !== '0') {
        throw Error(
          `Request is failed [${response.status}]: ${response.statusText}; result: ${JSON.stringify(result)}`
        );
      }
      return result;
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
    return crypto.createHmac('sha256', key).update(message).digest('hex');
  }
}

interface BodyParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
