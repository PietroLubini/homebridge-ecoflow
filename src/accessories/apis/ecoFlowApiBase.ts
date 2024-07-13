import { Logging } from 'homebridge';
import { DeviceConfig } from '../../config.js';
import * as crypto from 'crypto';
import NodeCache from 'node-cache';

export abstract class EcoFlowApiBase {
  private readonly apiUrl = 'https://api-e.ecoflow.com';
  private readonly parametersCache = new NodeCache({ stdTTL: 5});

  constructor(private config: DeviceConfig, private log: Logging) {
  }

  protected async executeSet<TValue>(paramName: string, paramValue: TValue): Promise<void> {
    this.log.debug(`Setting parameter ${paramName}:`, paramValue);
    const requestCmd: SetCmdRequest = {
      sn: this.config.serialNumber,
      params: {
        quotas: [paramName],
      },
    };
    const response = await this.execute<GetCmdResponse>('POST', requestCmd);
    const value = response.data[paramName];
    this.log.debug(`Parameter ${paramName} value:`, value);
    this.parametersCache.set(paramName, value);
  }

  protected async executeGet<TValue>(paramName: string): Promise<TValue> {
    if (!this.parametersCache.get(paramName)) {
      this.log.debug('Getting parameter:', paramName);
      const requestCmd: GetCmdRequest = {
        sn: this.config.serialNumber,
        params: {
          quotas: [paramName],
        },
      };
      const response = await this.execute<GetCmdResponse>('POST', requestCmd);
      const value = response.data[paramName];
      this.log.debug(`Parameter ${paramName} value:`, value);
      this.parametersCache.set(paramName, value);
    } else {
      this.log.debug('Getting parameter from cache:', paramName);
    }
    return this.parametersCache.get(paramName) as TValue;
  }

  private composeSignMessage(obj: BodyParams, prefix: string = ''): string {
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

  private async execute<TResponse>(method: string, data: object): Promise<TResponse> {
    const url = `${this.apiUrl}/iot-open/sign/device/quota`;
    const accessKey = this.config.accessKey;
    const nonce = this.getNonce();
    const timestamp = Date.now();
    const message = `${this.composeSignMessage(data)}&accessKey=${accessKey}&nonce=${nonce}&timestamp=${timestamp}`;

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

interface GetCmdRequest {
  sn: string;
  params: GetCmdRequestParams;
}

interface GetCmdRequestParams {
  quotas: string[];
}

interface GetCmdResponse {
  code: string;
  message: string;
  data: {
    [key: string]: unknown;
  };
}

interface SetCmdRequest {
  sn: string;
  params: GetCmdRequestParams;
}