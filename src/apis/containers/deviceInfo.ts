import { DeviceAccessConfig } from '@ecoflow/config';
import { Logging } from 'homebridge';

export type ConnectionKey = string;
export type AccessKey = string;

export class DeviceInfo {
  private readonly _connectionKey: ConnectionKey;
  private readonly _accessKey: AccessKey;
  constructor(
    public readonly config: DeviceAccessConfig,
    public readonly log: Logging
  ) {
    this._connectionKey = `${config.accessKey}_${config.secretKey}`;
    this._accessKey = config.accessKey;
  }

  public get connectionKey(): ConnectionKey {
    return this._connectionKey;
  }

  public get accessKey(): AccessKey {
    return this._accessKey;
  }
}
