import { IContext } from '../interfaces/contracts';
import { PluginConfigRendererBase } from './pluginConfigRendererBase';

export class PluginConfigNameRenderer extends PluginConfigRendererBase {
  public render(context: IContext): void {
    this.componentRenderer.renderTextBox(
      $('#generalSettings'),
      'name',
      context.configSchema.schema.properties.name,
      context.configuration.name,
      async newValue => {
        context.configuration.name = newValue;
        await this.updatePluginConfig(context);
      }
    );
  }
}
