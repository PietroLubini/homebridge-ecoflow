import { DeviceInfo } from '@ecoflow/apis/containers/deviceInfo';
import {
  AcquireCertificateData,
  CmdResponse,
  CmdResponseWithData,
  GetCmdRequest,
  GetQuotasCmdRequest,
  HttpMethod,
} from '@ecoflow/apis/interfaces/httpApiContracts';
import { LocationType } from '@ecoflow/config';
import * as crypto from 'crypto';

const ApiUrlUs = 'https://api-a.ecoflow.com';
const ApiUrlEu = 'https://api-e.ecoflow.com';
const QuotaPath = '/iot-open/sign/device/quota';
const QuotaAllPath = '/iot-open/sign/device/quota/all';
const CertificatePath = '/iot-open/sign/certification';

interface Dict {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class EcoFlowHttpApiManager {
  public async getQuotas<TData>(quotas: string[], deviceInfo: DeviceInfo): Promise<TData | null> {
    deviceInfo.log.debug('Get quotas:', quotas);
    const requestCmd: GetQuotasCmdRequest = {
      sn: deviceInfo.config.serialNumber,
      params: {
        quotas,
      },
    };
    const response = await this.execute<CmdResponseWithData<Dict>>(deviceInfo, QuotaPath, HttpMethod.Post, requestCmd);
    if (!response.failed) {
      const data = this.convertData<TData>(response.data);
      deviceInfo.log.debug(`Received quotas: ${JSON.stringify(data, null, 2)}`);
      return data;
    }
    return null;
  }

  public async getAllQuotas<TData>(deviceInfo: DeviceInfo): Promise<TData | null> {
    deviceInfo.log.debug('Get all quotas');
    const requestCmd: GetCmdRequest = {
      sn: deviceInfo.config.serialNumber,
    };
    const response = await this.execute<CmdResponseWithData<Dict>>(
      deviceInfo,
      QuotaAllPath,
      HttpMethod.Get,
      requestCmd
    );
    if (!response.failed) {
      const data = this.convertData<TData>(response.data);
      deviceInfo.log.debug(`Received all quotas: ${JSON.stringify(data, null, 2)}`);
      return data;
    }
    return null;
  }

  public async acquireCertificate(deviceInfo: DeviceInfo): Promise<AcquireCertificateData | null> {
    deviceInfo.log.debug('Acquire certificate for MQTT connection');
    const response = await this.execute<CmdResponseWithData<AcquireCertificateData>>(
      deviceInfo,
      CertificatePath,
      HttpMethod.Get
    );
    if (!response.failed) {
      return response.data;
    }
    return null;
  }

  protected async execute<TResponse extends CmdResponse>(
    deviceInfo: DeviceInfo,
    relativeUrl: string,
    method: HttpMethod,
    queryParameters: object | null = null
  ): Promise<TResponse> {
    const apiUrl = deviceInfo.config.location === LocationType.US ? ApiUrlUs : ApiUrlEu;
    const url = new URL(relativeUrl, apiUrl);
    const accessKey = deviceInfo.config.accessKey;
    const nonce = this.getNonce();
    const timestamp = Date.now();
    const queryParams = this.composeSignMessage(queryParameters);
    const params = queryParams ? `${queryParams}&` : '';
    const message = `${params}accessKey=${accessKey}&nonce=${nonce}&timestamp=${timestamp}`;
    const requestUrl = queryParams ? `${url}?${queryParams}` : url.toString();

    const headers: HeadersInit = {
      accessKey,
      nonce,
      timestamp: timestamp.toString(),
      sign: this.createHmacSha256(deviceInfo.config.secretKey, message),
    };
    const options: RequestInit = { method };
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
      deviceInfo.log.error('Request is failed:', e);
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
