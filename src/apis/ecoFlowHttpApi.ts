import * as crypto from 'crypto';
import { Logging } from 'homebridge';
import { DeviceConfig } from '../config.js';

const ApiUrl = 'https://api-e.ecoflow.com';
const QuotaPath = '/iot-open/sign/device/quota';
const QuotaAllPath = '/iot-open/sign/device/quota/all';
const CertificatePath = '/iot-open/sign/certification';

export enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
}

export interface CmdResponse {
  code: string;
  message: string;
  failed: boolean;
}

export interface CmdResponseWithData<TData> extends CmdResponse {
  code: string;
  message: string;
  data: TData;
}

export interface GetCmdRequest {
  sn: string;
}

export interface GetQuotasCmdRequest extends GetCmdRequest {
  params: GetQuotasCmdRequestParams;
}

export interface GetQuotasCmdRequestParams {
  quotas: string[];
}

export interface AcquireCertificateData {
  certificateAccount: string;
  certificatePassword: string;
  url: string;
  port: string;
  protocol: string;
}

interface Dict {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class EcoFlowHttpApi {
  constructor(
    private readonly config: DeviceConfig,
    private readonly log: Logging
  ) {}

  public async getQuotas<TData>(quotas: string[]): Promise<TData> {
    this.log.debug('Get quotas:', quotas);
    const requestCmd: GetQuotasCmdRequest = {
      sn: this.config.serialNumber,
      params: {
        quotas,
      },
    };
    const response = await this.execute<CmdResponseWithData<Dict>>(QuotaPath, HttpMethod.Post, requestCmd);
    if (!response.failed) {
      const data = this.convertData<TData>(response.data);
      this.log.debug('Quotas:', data);
      return data;
    }
    return {} as TData;
  }

  public async getAllQuotas<TData>(): Promise<TData> {
    this.log.debug('Get all quotas');
    const requestCmd: GetCmdRequest = {
      sn: this.config.serialNumber,
    };
    const response = await this.execute<CmdResponseWithData<Dict>>(QuotaAllPath, HttpMethod.Get, requestCmd);
    if (!response.failed) {
      const data = this.convertData<TData>(response.data);
      this.log.debug('All quotas:', data);
      return data;
    }
    return {} as TData;
  }

  public async acquireCertificate(): Promise<AcquireCertificateData | null> {
    this.log.debug('Acquire certificate for MQTT connection');
    const response = await this.execute<CmdResponseWithData<AcquireCertificateData>>(CertificatePath, HttpMethod.Get);
    if (!response.failed) {
      this.log.debug('Certificate data:', response.data);
      return response.data;
    }
    return null;
  }

  protected async execute<TResponse extends CmdResponse>(
    relativeUrl: string,
    method: HttpMethod,
    queryParameters: object | null = null,
    body: object | null = null
  ): Promise<TResponse> {
    const url = new URL(relativeUrl, ApiUrl);
    const accessKey = this.config.accessKey;
    const nonce = this.getNonce();
    const timestamp = Date.now();
    const queryParams = this.composeSignMessage(queryParameters);
    let params = queryParams ? `${queryParams}&` : '';
    const bodyParamsMessage = this.composeSignMessage(body);
    params = bodyParamsMessage ? `${params}${bodyParamsMessage}&` : params;
    const message = `${params}accessKey=${accessKey}&nonce=${nonce}&timestamp=${timestamp}`;
    const requestUrl = queryParams ? `${url}?${queryParams}` : url;

    const headers: HeadersInit = {
      accessKey,
      nonce,
      timestamp: timestamp.toString(),
      sign: this.createHmacSha256(this.config.secretKey, message),
    };
    const options: RequestInit = { method };
    if (body) {
      options.body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }
    options.headers = new Headers(headers);

    try {
      const response = await fetch(requestUrl, options);
      const result = (await response.json()) as unknown as TResponse;
      if (result.code !== '0') {
        throw Error(
          `Request to "${requestUrl}" with options: "${this.stringifyOptions(options)}" is failed
          [${response.status}]: ${response.statusText}; result: ${JSON.stringify(result)}`
        );
      }
      return result;
    } catch (e) {
      this.log.error('Request is failed:', e);
      return {
        code: '500',
        message: (e as Error)?.message,
        failed: true,
      } as TResponse;
    }
  }

  private getNonce(): string {
    const min = 0;
    const max = 999999;
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomNumber.toString().padStart(6, '0');
  }

  private composeSignMessage(obj: Dict | null, prefix: string = ''): string {
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

  private stringifyOptions(options: RequestInit): string {
    const headersObject: {
      [key: string]: string;
    } = {};
    (options.headers as Headers).forEach((value, key) => {
      headersObject[key] = value;
    });
    const newOptions = {
      ...options,
      headers: headersObject,
    };
    return JSON.stringify(newOptions);
  }

  private convertData<TData>(data: Dict): TData {
    const result: Dict = {};
    Object.keys(data).forEach(key => {
      const keys = key.split('.');
      let current = result;

      keys.forEach((k, index) => {
        if (index === keys.length - 1) {
          current[k] = data[key];
        } else {
          current[k] = current[k] || {};
          current = current[k];
        }
      });
    });
    return result as TData;
  }
}
