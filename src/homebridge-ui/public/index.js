import { SettingsManager } from './managers/settingsManager.js';

(async () => {
  // eslint-disable-next-line no-undef
  const pluginConfig = await homebridge.getPluginConfig();
  // eslint-disable-next-line no-undef
  const configSchema = await homebridge.getPluginConfigSchema();
  const configuration = pluginConfig[0];

  const settingsManager = new SettingsManager();
  settingsManager.render(configuration, configSchema);
})();
