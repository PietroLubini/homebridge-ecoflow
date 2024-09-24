import { renderEcoFlowPluginConfig } from '@ecoflow/homebridge-ui/public/index';
import { IRenderer } from '@ecoflow/homebridge-ui/public/interfaces/contracts';
import { IHomebridge, PluginConfig, PluginConfigSchema } from '@ecoflow/homebridge-ui/public/interfaces/homebridge';
import { ComponentRenderer } from '@ecoflow/homebridge-ui/public/renderers/componentRenderer';
import { PluginConfigDevicesRenderer } from '@ecoflow/homebridge-ui/public/renderers/pluginConfigDevicesRenderer';
import { PluginConfigNameRenderer } from '@ecoflow/homebridge-ui/public/renderers/pluginConfigNameRenderer';
import { PluginConfigRenderer } from '@ecoflow/homebridge-ui/public/renderers/pluginConfigRenderer';

jest.mock('@ecoflow/homebridge-ui/public/renderers/componentRenderer');
jest.mock('@ecoflow/homebridge-ui/public/renderers/pluginConfigNameRenderer');
jest.mock('@ecoflow/homebridge-ui/public/renderers/pluginConfigDevicesRenderer');
jest.mock('@ecoflow/homebridge-ui/public/renderers/pluginConfigRenderer');

describe('index', () => {
  it('should set function to window object when reference to file is loaded', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((window as any).renderEcoFlowPluginConfig).toBeDefined();
  });

  describe('renderEcoFlowPluginConfig', () => {
    let componentRendererMock: jest.Mocked<ComponentRenderer>;
    let pluginConfigNameRendererMock: jest.Mocked<PluginConfigNameRenderer>;
    let pluginConfigDevicesRendererMock: jest.Mocked<PluginConfigDevicesRenderer>;
    let pluginConfigRendererMock: jest.Mocked<PluginConfigRenderer>;
    let actualRenderers: IRenderer[];
    let homebridgeProviderMock: jest.Mocked<IHomebridge>;
    let pluginConfig: PluginConfig[];
    let configSchema: PluginConfigSchema;

    beforeEach(() => {
      homebridgeProviderMock = {
        getPluginConfig: jest.fn(),
        getPluginConfigSchema: jest.fn(),
      } as unknown as jest.Mocked<IHomebridge>;

      function createRenderer<TRenderer>(
        Renderer: new (componentRenderer: ComponentRenderer) => TRenderer
      ): jest.Mocked<TRenderer> {
        const mock = new Renderer(componentRendererMock) as jest.Mocked<TRenderer>;
        (Renderer as jest.Mock).mockImplementation(() => {
          return mock;
        });
        return mock;
      }

      componentRendererMock = new ComponentRenderer() as jest.Mocked<ComponentRenderer>;
      (ComponentRenderer as jest.Mock).mockImplementation(() => {
        return componentRendererMock;
      });
      pluginConfigNameRendererMock = createRenderer(PluginConfigNameRenderer);
      pluginConfigDevicesRendererMock = createRenderer(PluginConfigDevicesRenderer);

      pluginConfigRendererMock = new PluginConfigRenderer([]) as jest.Mocked<PluginConfigRenderer>;
      (PluginConfigRenderer as jest.Mock).mockImplementation((renderers: IRenderer[]) => {
        actualRenderers = renderers;
        return pluginConfigRendererMock;
      });

      pluginConfig = [{ name: 'name1', devices: [] }];
      homebridgeProviderMock.getPluginConfig.mockResolvedValueOnce(pluginConfig);
      configSchema = {} as PluginConfigSchema;
      homebridgeProviderMock.getPluginConfigSchema.mockResolvedValueOnce(configSchema);
    });

    it('should create renderer with name and devices sub-renderers when is called', async () => {
      await renderEcoFlowPluginConfig(homebridgeProviderMock);

      expect(actualRenderers).toEqual([pluginConfigNameRendererMock, pluginConfigDevicesRendererMock]);
    });

    it('should call settings manager render when is called', async () => {
      await renderEcoFlowPluginConfig(homebridgeProviderMock);

      expect(pluginConfigRendererMock.render).toHaveBeenCalledWith({
        homebridgeProvider: homebridgeProviderMock,
        configuration: pluginConfig[0],
        configSchema,
      });
    });
  });
});
