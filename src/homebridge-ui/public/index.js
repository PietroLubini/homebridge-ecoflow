import { SettingsManager } from './managers/settingsManager.js';

(async () => {
  const pluginConfig = await homebridge.getPluginConfig();
  const configSchema = await homebridge.getPluginConfigSchema();
  const configuration = pluginConfig[0];

  const settingsManager = new SettingsManager();
  settingsManager.render(configuration, configSchema, {
    'Delta 2': ['powerStream'],
    'Delta 2 Max': ['powerStream'],
    PowerStream: ['battery'],
  });
})();
