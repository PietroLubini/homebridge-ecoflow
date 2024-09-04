import { IHomebridge, PluginConfig, PluginConfigSchema } from '../interfaces/homebridge';

export interface IContext {
  homebridgeProvider: IHomebridge;
  configSchema: PluginConfigSchema;
  configuration: PluginConfig;
}

export interface IDeviceContext extends IContext {
  hideDeviceSettingsPerModel: Record<string, string[]>;
}

export type ChangedCallbackHandler = (value: string) => void;

export interface IRenderer {
  render(context: IContext): void;
}
