import NodeCache from 'node-cache';
import { EcoFlowApiBase } from './ecoFlowApiBase.js';

const QuotaRelativePath = '/iot-open/sign/device/quota';

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

export abstract class EcoFlowHttpApiBase extends EcoFlowApiBase {
  private readonly parametersCache = new NodeCache({ stdTTL: 5});

  protected async executeGet<TValue>(paramName: string): Promise<TValue> {
    if (!this.parametersCache.get(paramName)) {
      this.log.debug('Getting parameter:', paramName);
      const requestCmd: GetCmdRequest = {
        sn: this.config.serialNumber,
        params: {
          quotas: [paramName],
        },
      };
      const response = await this.execute<GetCmdResponse>(QuotaRelativePath, 'POST', requestCmd);
      const value = response.data[paramName];
      this.log.debug(`Parameter ${paramName} value:`, value);
      this.parametersCache.set(paramName, value);
    } else {
      this.log.debug('Getting parameter from cache:', paramName);
    }
    return this.parametersCache.get(paramName) as TValue;
  }

  protected async executeSet<TValue>(paramName: string, paramValue: TValue): Promise<void> {
    this.log.debug(`Setting parameter ${paramName}:`, paramValue);
    const requestCmd: SetCmdRequest = {
      sn: this.config.serialNumber,
      params: {
        quotas: [paramName],
      },
    };
    const response = await this.execute<GetCmdResponse>(QuotaRelativePath, 'POST', requestCmd);
    const value = response.data[paramName];
    this.log.debug(`Parameter ${paramName} value:`, value);
    this.parametersCache.set(paramName, value);
  }
}