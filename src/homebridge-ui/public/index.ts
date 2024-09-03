import { CommonRenderer } from '@ecoflow/homebridge-ui/public/renderers/commonRenderer';
import { IHomebridge } from './interfaces/homebridge';
import { PluginConfigRenderer } from './renderers/pluginConfigRender';

export async function renderEcoFlowPluginConfig(homebridgeProvider: IHomebridge) {
  const pluginConfig = await homebridgeProvider.getPluginConfig();
  const configSchema = await homebridgeProvider.getPluginConfigSchema();
  const configuration = pluginConfig[0];

  const renderer = new PluginConfigRenderer(new CommonRenderer());
  renderer.render(homebridgeProvider, configuration, configSchema, {
    'Delta 2': ['powerStream'],
    'Delta 2 Max': ['powerStream'],
    PowerStream: ['battery'],
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).renderEcoFlowPluginConfig = renderEcoFlowPluginConfig;
