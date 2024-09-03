// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { renderEcoFlowPluginConfig } from '@ecoflow/homebridge-ui/public/index';
import { IHomebridge, PluginConfig, PluginConfigSchema } from '@ecoflow/homebridge-ui/public/interfaces/homebridge';
import { CommonRenderer } from '@ecoflow/homebridge-ui/public/renderers/commonRenderer';
import { PluginConfigRenderer } from '@ecoflow/homebridge-ui/public/renderers/pluginConfigRender';

jest.mock('@ecoflow/homebridge-ui/public/renderers/commonRenderer');
jest.mock('@ecoflow/homebridge-ui/public/renderers/pluginConfigRender');

describe('renderEcoFlowPluginConfig', () => {
  let homebridgeProviderMock: jest.Mocked<IHomebridge>;
  let commonRendererMock: jest.Mocked<CommonRenderer>;
  let pluginConfigRendererMock: jest.Mocked<PluginConfigRenderer>;

  beforeEach(() => {
    homebridgeProviderMock = {
      getPluginConfig: jest.fn(),
      getPluginConfigSchema: jest.fn(),
    } as unknown as jest.Mocked<IHomebridge>;

    commonRendererMock = new CommonRenderer() as jest.Mocked<CommonRenderer>;
    (CommonRenderer as jest.Mock).mockImplementation(() => {
      return commonRendererMock;
    });

    pluginConfigRendererMock = new PluginConfigRenderer(commonRendererMock) as jest.Mocked<PluginConfigRenderer>;
    (PluginConfigRenderer as jest.Mock).mockImplementation(() => {
      return pluginConfigRendererMock;
    });
  });

  it('should call settings manager render when is called', async () => {
    const pluginConfig: PluginConfig[] = [{ name: 'name1', devices: [] }];
    homebridgeProviderMock.getPluginConfig.mockResolvedValueOnce(pluginConfig);
    const configSchema = {} as PluginConfigSchema;
    homebridgeProviderMock.getPluginConfigSchema.mockResolvedValueOnce(configSchema);

    await renderEcoFlowPluginConfig(homebridgeProviderMock);

    expect(pluginConfigRendererMock.render).toHaveBeenCalledWith(
      homebridgeProviderMock,
      pluginConfig[0],
      configSchema,
      {
        'Delta 2': ['powerStream'],
        'Delta 2 Max': ['powerStream'],
        PowerStream: ['battery'],
      }
    );
  });

  it('should set function to window object when reference to file is loaded', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((window as any).renderEcoFlowPluginConfig).toBeDefined();
  });
});
