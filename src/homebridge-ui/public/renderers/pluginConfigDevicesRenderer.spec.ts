import { IContext } from '@ecoflow/homebridge-ui/public/interfaces/contracts';
import {
  FormOnChangeCallback,
  IForm,
  IHomebridge,
  PluginConfig,
  PluginConfigSchema,
  PluginConfigSchemaDevices,
  PluginConfigSchemaEnum,
  PluginConfigSchemaObject,
  PluginDeviceConfig,
} from '@ecoflow/homebridge-ui/public/interfaces/homebridge';
import { ComponentRenderer } from '@ecoflow/homebridge-ui/public/renderers/componentRenderer';
import { PluginConfigDevicesRenderer } from '@ecoflow/homebridge-ui/public/renderers/pluginConfigDevicesRenderer';
import $ from 'jquery';

describe('PluginConfigDevicesRenderer', () => {
  let context: IContext;
  let homebridgeProviderMock: jest.Mocked<IHomebridge>;
  let formMock: jest.Mocked<IForm>;
  let configuration: PluginConfig;
  let configSchema: PluginConfigSchema;
  let devicesContainer: HTMLElement;
  let devicesTabsElement: HTMLElement;
  let devicesTabPanelsElement: HTMLElement;
  let renderer: PluginConfigDevicesRenderer;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).$ = $;
  });

  afterAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).$ = undefined;
  });

  beforeEach(() => {
    homebridgeProviderMock = {
      createForm: jest.fn(),
      updatePluginConfig: jest.fn(),
    } as unknown as jest.Mocked<IHomebridge>;
    formMock = { onChange: jest.fn(), end: jest.fn() } as unknown as jest.Mocked<IForm>;
    homebridgeProviderMock.createForm.mockReturnValue(formMock);
    configuration = {
      name: 'name1',
      platform: 'EcoFlowPluginPlatform',
      devices: [
        {
          name: 'First Device',
          model: 'Delta 2 Max',
          prop1: 'true',
          battery: {
            additionalCharacteristics: ['Battery Level, %'],
          } as unknown as string,
        },
        { name: 'Second Device', model: 'PowerStream', prop1: 'false' },
      ],
    };
    const modelSchema: PluginConfigSchemaEnum = {
      title: 'Model',
      default: 'Delta 2',
      required: true,
      enum: ['Delta 2', 'Delta 2 Max', 'PowerStream'],
    };
    const batterySchema = {
      properties: {
        additionalCharacteristics: {
          items: {
            title: 'Characteristic',
            type: 'string',
            enum: ['Battery Level, %', 'Input Consumption, W', 'Output Consumption, W'],
          },
        },
      },
    } as unknown as PluginConfigSchemaObject;
    const powerStreamSchema = {
      properties: {
        type: {
          title: 'Type',
          required: true,
          enum: ['600', '800'],
        },
        pvAdditionalCharacteristics: {
          title: 'PV Additional Characteristics',
          description: 'List of additional characteristics for PVs connected for PowerStream',
          items: {
            title: 'Characteristic',
            enum: ['Output Consumption, W'],
          },
        },
      },
    } as unknown as PluginConfigSchemaObject;
    const outletPlugSchema = {
      properties: {
        additionalCharacteristics: {
          items: {
            title: 'Characteristic',
            type: 'string',
            enum: ['Output Voltage, V', 'Output Current, A', 'Output Consumption, W'],
          },
        },
      },
    } as unknown as PluginConfigSchemaObject;
    configSchema = {
      schema: {
        properties: {
          name: { title: 'Name Title' },
          devices: {
            title: 'Devices',
            items: {
              properties: {
                name: {
                  title: 'Name',
                  required: true,
                  description: 'Name of the EcoFlow device',
                },
                model: modelSchema,
                prop1: {
                  title: 'Simulate',
                  default: 'true',
                  required: false,
                },
                battery: batterySchema,
                powerStream: powerStreamSchema,
                outlet: outletPlugSchema,
              },
            },
          },
        },
      },
    };
    context = { homebridgeProvider: homebridgeProviderMock, configuration, configSchema };

    devicesContainer = document.createElement('div');
    document.body.replaceChildren(devicesContainer);
    devicesTabsElement = document.createElement('ul');
    devicesTabsElement.id = 'devicesTabs';
    devicesTabPanelsElement = document.createElement('div');
    devicesTabPanelsElement.id = 'devicesPanels';
    devicesContainer.appendChild(devicesTabsElement);
    devicesContainer.appendChild(devicesTabPanelsElement);

    renderer = new PluginConfigDevicesRenderer(new ComponentRenderer());
  });

  function clone<TObject>(obj: TObject): TObject {
    return JSON.parse(JSON.stringify(obj));
  }

  function cleanupAdditionalProperties(expectedSchema: PluginConfigSchemaDevices, ...names: string[]): void {
    names.forEach(name => {
      delete expectedSchema.items.properties[name];
    });
  }

  describe('hideDeviceSettingsPerModel', () => {
    it('should contain proper hideDeviceSettingsPerModel configuration', () => {
      const expected = {
        'Delta 2': ['powerStream', 'outlet'],
        'Delta 2 Max': ['powerStream', 'outlet'],
        'Delta Pro': ['powerStream', 'outlet'],
        'Delta Pro 3': ['powerStream', 'outlet'],
        'Delta Pro Ultra': ['powerStream', 'outlet'],
        PowerStream: ['battery', 'outlet'],
        'Smart Plug': ['battery', 'powerStream'],
      };

      const actual = renderer.hideDeviceSettingsPerModel;

      expect(actual).toEqual(expected);
    });
  });

  describe('render', () => {
    function activateTab(index: number): void {
      const tab = $(devicesTabsElement).find(`#deviceTab${index}`);
      tab.trigger('click');
    }

    function removeDevice(index: number): void {
      const removeDevice = $(devicesTabPanelsElement).find(`#deviceTabPanelClose${index}`);
      removeDevice.trigger('click');
    }

    describe('tabsRendering', () => {
      it('should render tabs when there are 2 devices in configuration', () => {
        renderer.render(context);

        expect(devicesTabsElement).toMatchSnapshot();
      });

      it('should render tabs when there are no devices in configuration', () => {
        context.configuration.devices = [];
        renderer.render(context);

        expect(devicesTabsElement).toMatchSnapshot();
      });
    });

    describe('tabsNavigation', () => {
      let expectedSchema: PluginConfigSchemaDevices;

      beforeEach(() => {
        expectedSchema = clone(configSchema.schema.properties.devices);
        cleanupAdditionalProperties(expectedSchema, 'model');
      });

      it('should render form for first device in configuration by default', () => {
        cleanupAdditionalProperties(expectedSchema, 'powerStream', 'outlet');
        const expectedConfiguration = clone(configuration).devices[0];

        renderer.render(context);

        expect(homebridgeProviderMock.createForm).toHaveBeenCalledTimes(1);
        expect(homebridgeProviderMock.createForm).toHaveBeenCalledWith(
          { schema: expectedSchema.items },
          expectedConfiguration
        );
      });

      it('should render form for second device when second tab is clicked', () => {
        cleanupAdditionalProperties(expectedSchema, 'battery', 'outlet');
        const expectedConfiguration = clone(configuration).devices[1];

        renderer.render(context);
        homebridgeProviderMock.createForm.mockClear();
        activateTab(1);

        expect(homebridgeProviderMock.createForm).toHaveBeenCalledTimes(1);
        expect(homebridgeProviderMock.createForm).toHaveBeenCalledWith(
          { schema: expectedSchema.items },
          expectedConfiguration
        );
        expect(formMock.end).toHaveBeenCalledTimes(1);
      });
    });

    describe('tabPanelsRendering', () => {
      it('should render tab panels and activate first one when there are 2 devices in configuration', () => {
        renderer.render(context);

        expect(devicesTabPanelsElement).toMatchSnapshot();
      });

      it('should render tab panels when there are no devices in configuration', () => {
        context.configuration.devices = [];
        renderer.render(context);

        expect(devicesTabPanelsElement).toMatchSnapshot();
      });
    });

    describe('addNewDevice', () => {
      let expectedSchema: PluginConfigSchemaDevices;

      beforeEach(() => {
        expectedSchema = clone(configSchema.schema.properties.devices);
        cleanupAdditionalProperties(expectedSchema, 'model', 'powerStream', 'outlet');
        renderer.render(context);
        homebridgeProviderMock.createForm.mockClear();
      });

      it('should render form for new device when addDeviceTab is clicked', () => {
        const deviceTabAdd = $(devicesTabsElement).find('#deviceTabAdd');
        deviceTabAdd.trigger('click');

        expect(homebridgeProviderMock.createForm).toHaveBeenCalledTimes(1);
        expect(homebridgeProviderMock.createForm).toHaveBeenCalledWith(
          { schema: expectedSchema.items },
          { model: 'Delta 2', prop1: 'true' }
        );
        expect(formMock.end).toHaveBeenCalledTimes(2);
      });

      it('should render tab with default values when addDeviceTab is clicked', () => {
        const deviceTabAdd = $(devicesTabsElement).find('#deviceTabAdd');
        deviceTabAdd.trigger('click');

        expect(devicesContainer).toMatchSnapshot();
      });
    });

    describe('removeDevice', () => {
      beforeEach(() => {
        renderer.render(context);
      });

      it('should remove active tab when remove button is clicked', () => {
        activateTab(1);
        removeDevice(1);

        expect(devicesContainer).toMatchSnapshot();
      });

      it('should leave addNewDevice tab only when remove button is clicked for last device', () => {
        activateTab(1);
        removeDevice(1);
        removeDevice(0);

        expect(devicesContainer).toMatchSnapshot();
      });
    });

    describe('applyChanges', () => {
      let formOnChangeCallback: FormOnChangeCallback;

      beforeEach(() => {
        renderer.render(context);
        formOnChangeCallback = formMock.onChange.mock.calls[0][0];
      });

      it('should update changes when there are any made on form', async () => {
        await formOnChangeCallback({
          name: 'First Device Changed',
          prop1: 'false',
          battery: {
            additionalCharacteristics: ['Battery Level, %', 'Input Consumption, W'],
          } as unknown as string,
        } as unknown as PluginDeviceConfig);

        expect(homebridgeProviderMock.updatePluginConfig).toHaveBeenCalledTimes(1);
        expect(homebridgeProviderMock.updatePluginConfig).toHaveBeenCalledWith([
          {
            name: 'name1',
            devices: [
              {
                name: 'First Device Changed',
                model: 'Delta 2 Max',
                prop1: 'false',
                battery: {
                  additionalCharacteristics: ['Battery Level, %', 'Input Consumption, W'],
                } as unknown as string,
              },
              { name: 'Second Device', model: 'PowerStream', prop1: 'false' },
            ],
          },
        ]);
      });

      it('should update tab name when name was changed on form', async () => {
        await formOnChangeCallback({ name: 'First Device Changed' } as unknown as PluginDeviceConfig);
        const actual = $(devicesTabsElement).find('#deviceTab0').text();

        expect(actual).toBe('First Device Changed');
      });
    });

    describe('modelChanged', () => {
      let modelElement: JQuery;
      let expectedSchema: PluginConfigSchemaDevices;

      beforeEach(() => {});

      beforeEach(() => {
        expectedSchema = clone(configSchema.schema.properties.devices);
        cleanupAdditionalProperties(expectedSchema, 'model');

        renderer.render(context);
        homebridgeProviderMock.createForm.mockClear();
        modelElement = $(devicesTabPanelsElement).find('#devicemodel0');
      });

      it('should update tab name when name was changed on form', () => {
        modelElement.val('PowerStream');
        modelElement.trigger('change');

        cleanupAdditionalProperties(expectedSchema, 'battery', 'outlet');
        const expectedConfiguration = clone(configuration).devices[0];

        expect(homebridgeProviderMock.createForm).toHaveBeenCalledTimes(1);
        expect(homebridgeProviderMock.createForm).toHaveBeenCalledWith(
          { schema: expectedSchema.items },
          expectedConfiguration
        );
        expect(formMock.end).toHaveBeenCalledTimes(1);
      });
    });
  });
});
