import { IContext, IRenderer } from '@ecoflow/homebridge-ui/public/interfaces/contracts';
import { PluginConfigRenderer } from '@ecoflow/homebridge-ui/public/renderers/pluginConfigRenderer';

describe('PluginConfigRenderer', () => {
  let context: IContext;
  let renderer1: jest.Mocked<IRenderer>;
  let renderer2: jest.Mocked<IRenderer>;
  let renderer: PluginConfigRenderer;

  describe('render', () => {
    beforeEach(() => {
      context = { configuration: {}, configSchema: { schema: {} } } as IContext;
      renderer1 = { render: jest.fn() } as jest.Mocked<IRenderer>;
      renderer2 = { render: jest.fn() } as jest.Mocked<IRenderer>;

      renderer = new PluginConfigRenderer([renderer1, renderer2]);
    });

    it('should call sub-renderers one render is called', async () => {
      renderer.render(context);

      expect(renderer1.render).toHaveBeenCalledWith(context);
      expect(renderer2.render).toHaveBeenCalledWith(context);
    });

    it('should initialize configuration inside context wgen it is not defined', async () => {
      renderer.render({ configSchema: { schema: {} } } as IContext);
      const actual = renderer1.render.mock.calls[0][0].configuration;

      expect(actual).toEqual({ name: undefined, devices: [] });
    });
  });
});
