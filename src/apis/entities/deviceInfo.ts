import { DeviceAccessConfig } from '@ecoflow/config';
import { Logging } from 'homebridge';

export type ConnectionKey = string;

export class DeviceInfo {
  private readonly _connectionKey: ConnectionKey;
  constructor(
    public readonly config: DeviceAccessConfig,
    public readonly log: Logging
  ) {
    this._connectionKey = `${config.accessKey}_${config.secretKey}`;
  }

  public get connectionKey(): ConnectionKey {
    return this._connectionKey;
  }
}
