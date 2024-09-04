import { IContext, IRenderer } from '../interfaces/contracts';
import { ComponentRenderer } from './componentRenderer';

export abstract class PluginConfigRendererBase implements IRenderer {
  constructor(protected readonly componentRenderer: ComponentRenderer) {}

  public abstract render(context: IContext): void;

  protected async updatePluginConfig(context: IContext): Promise<void> {
    const changes = this.clone(context.configuration);
    delete changes.platform;
    await context.homebridgeProvider.updatePluginConfig([changes]);
  }

  protected clone<TObject>(obj: TObject): TObject {
    return JSON.parse(JSON.stringify(obj));
  }
}
