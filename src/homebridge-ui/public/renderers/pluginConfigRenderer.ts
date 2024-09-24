import { IContext, IRenderer } from '../interfaces/contracts';

export class PluginConfigRenderer {
  constructor(private readonly renderers: IRenderer[]) {}

  public render(context: IContext): void {
    if (context.configuration === undefined) {
      context.configuration = {
        name: undefined as unknown as string,
        devices: [],
      };
    }
    this.renderers.forEach(renderer => renderer.render(context));
  }
}
