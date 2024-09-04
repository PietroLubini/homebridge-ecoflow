export interface IHomebridge {
  getPluginConfig: () => Promise<PluginConfig[]>;
  getPluginConfigSchema: () => Promise<PluginConfigSchema>;
  updatePluginConfig: (changes: PluginConfig[]) => Promise<void>;
  createForm: (schema: { schema: PluginConfigSchemaDevicesItems }, configuration: PluginDeviceConfig) => IForm;
}

export interface PluginConfig {
  name: string;
  platform?: string;
  devices: PluginDeviceConfig[];
}

export interface PluginDeviceConfig {
  name: string;
  model: string;
  [name: string]: string | undefined;
}

export interface PluginConfigSchema {
  schema: {
    properties: {
      name: PluginConfigSchemaObject;
      devices: PluginConfigSchemaDevices;
    };
  };
}

export interface PluginConfigSchemaObject {
  title: string;
  description?: string;
  default?: string;
  required?: boolean;
}

export interface PluginConfigSchemaEnum extends PluginConfigSchemaObject {
  enum: string[];
}

export interface PluginConfigSchemaDevices {
  title: string;
  items: PluginConfigSchemaDevicesItems;
}

export interface PluginConfigSchemaDevicesItems {
  properties: PluginConfigSchemaDevice;
}

export interface PluginConfigSchemaDevice {
  name: PluginConfigSchemaObject;
  model?: PluginConfigSchemaEnum;
  [name: string]: PluginConfigSchemaObject | undefined;
}

export type FormOnChangeCallback = (newConfiguration: PluginDeviceConfig) => Promise<void>;

export interface IForm {
  onChange: (callback: FormOnChangeCallback) => void;
  end: () => void;
}
