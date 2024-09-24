import { IContext } from '@ecoflow/homebridge-ui/public/interfaces/contracts';
import { IHomebridge, PluginConfig, PluginConfigSchema } from '@ecoflow/homebridge-ui/public/interfaces/homebridge';
import { ComponentRenderer } from '@ecoflow/homebridge-ui/public/renderers/componentRenderer';
import { PluginConfigNameRenderer } from '@ecoflow/homebridge-ui/public/renderers/pluginConfigNameRenderer';
import $ from 'jquery';

describe('PluginConfigNameRenderer', () => {
  let context: IContext;
  let homebridgeProviderMock: jest.Mocked<IHomebridge>;
  let configuration: PluginConfig;
  let configSchema: PluginConfigSchema;
  let generalSettingsElement: HTMLElement;
  let renderer: PluginConfigNameRenderer;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).$ = $;
  });

  afterAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).$ = undefined;
  });

  beforeEach(() => {
    homebridgeProviderMock = { updatePluginConfig: jest.fn() } as unknown as jest.Mocked<IHomebridge>;
    configuration = { name: 'name1', devices: [{ name: 'device1' }] } as PluginConfig;
    configSchema = { schema: { properties: { name: { title: 'Name Title' } } } } as PluginConfigSchema;
    context = { homebridgeProvider: homebridgeProviderMock, configuration, configSchema };

    generalSettingsElement = document.createElement('div');
    generalSettingsElement.id = 'generalSettings';
    document.body.replaceChildren(generalSettingsElement);

    renderer = new PluginConfigNameRenderer(new ComponentRenderer());
  });

  describe('render', () => {
    it('should render a textbox for name property when is called', () => {
      renderer.render(context);

      expect(generalSettingsElement).toMatchSnapshot();
    });

    it('should updatePluginConfig when value of textbox is changed', () => {
      renderer.render(context);
      const $control = $(document).find('#devicename');
      const newValue = 'name2';
      $control.val(newValue).trigger('change');

      expect(homebridgeProviderMock.updatePluginConfig).toHaveBeenCalledWith([
        { name: 'name2', devices: [{ name: 'device1' }] },
      ]);
    });
  });
});
