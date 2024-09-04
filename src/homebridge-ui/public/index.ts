import { IHomebridge } from './interfaces/homebridge';
import { ComponentRenderer } from './renderers/componentRenderer';
import { PluginConfigDevicesRenderer } from './renderers/pluginConfigDevicesRenderer';
import { PluginConfigNameRenderer } from './renderers/pluginConfigNameRenderer';
import { PluginConfigRenderer } from './renderers/pluginConfigRenderer';

export async function renderEcoFlowPluginConfig(homebridgeProvider: IHomebridge) {
  const pluginConfig = await homebridgeProvider.getPluginConfig();
  const configSchema = await homebridgeProvider.getPluginConfigSchema();
  const configuration = pluginConfig[0];

  const componentRenderer = new ComponentRenderer();
  const renderer = new PluginConfigRenderer([
    new PluginConfigNameRenderer(componentRenderer),
    new PluginConfigDevicesRenderer(componentRenderer),
  ]);
  renderer.render({ homebridgeProvider, configuration, configSchema });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).renderEcoFlowPluginConfig = renderEcoFlowPluginConfig;
